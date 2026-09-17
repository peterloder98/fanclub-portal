"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Upload,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { decimalInputProps, sanitizeDecimalInput } from "@/lib/input/decimal-input";
import { autoKmNetCents, formatNetEur, parseEurToCents } from "@/lib/anni-management/money";
import {
  berlinTodayIsoDate,
  formatIsoDateDe,
  incomeOverviewRows,
  invoiceStatus,
  monthSettlementPreview,
  monthTitleDe,
  poolMovements,
  poolSaldoCents,
  yearTotals,
} from "@/lib/anni-management/calc";
import {
  DEFAULT_TRAVEL_TO_CLIENT_CENTS,
  INVOICE_STATUS_LABELS,
  JOB_LINE_KIND_LABELS,
  QUARTER_RULE_COPY,
  TRAVEL_MODE_LABELS,
  TRAVELER_LABELS,
  TRAVEL_MODES,
  type AnniMgmtJob,
  type AnniMgmtJobLine,
  type AnniMgmtMonthSettlement,
  type AnniMgmtPerson,
  type AnniMgmtPoolPayout,
  type InvoiceStatus,
  type JobLineKind,
  type TravelMode,
  type Traveler,
} from "@/lib/anni-management/types";
import {
  addIncomeTypeAction,
  addPoolPayoutAction,
  deleteAnniMgmtJobAction,
  deletePoolPayoutAction,
  inviteAnniManagementUserAction,
  markManagementTravelReimbursedAction,
  resendAnniManagementInviteAction,
  saveAnniMgmtJobAction,
  settleAnniMgmtMonthAction,
} from "@/app/(app)/anni-abrechnung/actions";

type TabId = "uebersicht" | "jobs" | "einnahmen" | "monat" | "jahr" | "pool" | "team";

const TABS: { id: TabId; label: string; inviteOnly?: boolean }[] = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "jobs", label: "Jobs" },
  { id: "einnahmen", label: "Einnahmen" },
  { id: "monat", label: "Monat" },
  { id: "jahr", label: "Jahr" },
  { id: "pool", label: "Reisekostenpool" },
  { id: "team", label: "Personen", inviteOnly: true },
];

const STATUS_VARIANT: Record<InvoiceStatus, "neutral" | "brand" | "success" | "warning" | "danger"> = {
  offen: "neutral",
  versendet: "brand",
  bezahlt: "success",
  überfällig: "danger",
};

function centsFromEurField(raw: string): number {
  return parseEurToCents(raw) ?? 0;
}

function eurFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

type DraftLine = {
  key: string;
  id?: string;
  line_kind: JobLineKind;
  income_type: string;
  amount_eur: string;
  traveler: Traveler;
  travel_mode: TravelMode;
  km: string;
  route_description: string;
  note: string;
};

function lineToDraft(line: AnniMgmtJobLine): DraftLine {
  return {
    key: line.id,
    id: line.id,
    line_kind: line.line_kind,
    income_type: line.income_type ?? "Gage",
    amount_eur: eurFromCents(line.amount_cents),
    traveler: line.traveler ?? "anni",
    travel_mode: line.travel_mode ?? "bahn",
    km: line.km != null ? String(line.km).replace(".", ",") : "",
    route_description: line.route_description ?? "",
    note: line.note ?? "",
  };
}

function emptyIncomeLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    line_kind: "income",
    income_type: "Gage",
    amount_eur: "",
    traveler: "anni",
    travel_mode: "bahn",
    km: "",
    route_description: "",
    note: "",
  };
}

function emptyTravelToClientLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    line_kind: "travel_to_client",
    income_type: "",
    amount_eur: eurFromCents(DEFAULT_TRAVEL_TO_CLIENT_CENTS),
    traveler: "anni",
    travel_mode: "bahn",
    km: "",
    route_description: "",
    note: "",
  };
}

function emptyExpenseTravel(who: Traveler = "anni"): DraftLine {
  return {
    key: crypto.randomUUID(),
    line_kind: "expense_travel",
    income_type: "",
    amount_eur: "",
    traveler: who,
    travel_mode: "bahn",
    km: "",
    route_description: "",
    note: "",
  };
}

function fieldClass() {
  return "h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]";
}

export function AnniAbrechnungWorkspace({
  jobs,
  payouts,
  settlements,
  incomeTypes,
  people,
  schemaReady,
  schemaError,
  canInvite,
  todayIso,
  initialYear,
  initialMonth,
}: {
  jobs: AnniMgmtJob[];
  payouts: AnniMgmtPoolPayout[];
  settlements: AnniMgmtMonthSettlement[];
  incomeTypes: string[];
  people: AnniMgmtPerson[];
  schemaReady: boolean;
  schemaError: string | null;
  canInvite: boolean;
  todayIso: string;
  initialYear: number;
  initialMonth: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("uebersicht");
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [editing, setEditing] = useState<AnniMgmtJob | null | "new">(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const years = useMemo(() => {
    const set = new Set<number>([initialYear, initialYear - 1]);
    for (const job of jobs) {
      const y = Number(job.performance_date.slice(0, 4));
      if (Number.isFinite(y)) set.add(y);
      if (job.paid_at) set.add(Number(job.paid_at.slice(0, 4)));
    }
    return [...set].sort((a, b) => b - a);
  }, [jobs, initialYear]);

  const incomeRows = useMemo(() => incomeOverviewRows(jobs, todayIso), [jobs, todayIso]);
  const monthPreview = useMemo(() => monthSettlementPreview(jobs, year, month), [jobs, year, month]);
  const yearSummary = useMemo(
    () => yearTotals(jobs, payouts, settlements, year, todayIso),
    [jobs, payouts, settlements, year, todayIso],
  );
  const movements = useMemo(() => poolMovements(jobs, payouts), [jobs, payouts]);
  const poolSaldo = useMemo(() => poolSaldoCents(jobs, payouts), [jobs, payouts]);
  const overdueCount = incomeRows.filter((r) => r.status === "überfällig").length;
  const settledThisMonth = settlements.find((s) => s.year === year && s.month === month);

  function flash(ok: string | null, err: string | null) {
    setOkMsg(ok);
    setError(err);
  }

  const visibleTabs = TABS.filter((t) => (t.inviteOnly ? canInvite : true));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {!schemaReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Die Tabellen sind noch nicht in der Datenbank. SQL-Datei{" "}
          <code>supabase/160_anni_management_finance.sql</code> ausführen.
          {schemaError ? <div className="mt-1 text-xs">{schemaError}</div> : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-fc-navy/10 bg-gradient-to-br from-fc-navy to-fc-blue p-5 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Vertraulich</p>
        <h1 className="mt-1 text-xl font-semibold">Abrechnung Anni & Management</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/85">
          Drei Töpfe: 20 % vom bezahlten Einnahmen-Netto (ohne Kundenreise und Extra-Spesen), der
          fortlaufende Reisekostenpool, und die quartalsweise Auszahlung der Management-Reisekosten.
          Jobs sind die einzige Quelle — keine zweite Einnahmenliste.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-white/70">Pool-Saldo</div>
            <div className="text-lg font-semibold tabular-nums">{formatNetEur(poolSaldo)}</div>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-white/70">
              20 % {monthTitleDe(year, month)}
            </div>
            <div className="text-lg font-semibold tabular-nums">{formatNetEur(monthPreview.feeCents)}</div>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-white/70">Offene Rechnungen</div>
            <div className="text-lg font-semibold tabular-nums">{overdueCount} überfällig</div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</div>
      ) : null}
      {okMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {okMsg}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1 rounded-2xl border bg-white p-1">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium",
              tab === t.id ? "bg-fc-navy text-white" : "text-slate-600 hover:bg-slate-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "uebersicht" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Aktueller Monat</CardTitle>
              <CardDescription>
                Bezahlt nach Zahlungsdatum. {QUARTER_RULE_COPY}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Einnahmen (20 %-Basis)" value={formatNetEur(monthPreview.paidIncomeBaseCents)} />
              <Row label="Management 20 %" value={formatNetEur(monthPreview.feeCents)} />
              <Row
                label={monthPreview.isQuarterMonth ? "Management-Reise (fällig)" : "Management-Reise (nicht fällig)"}
                value={formatNetEur(monthPreview.managementTravelCents)}
              />
              <Row label="Rechnung Management gesamt" value={formatNetEur(monthPreview.totalInvoiceCents)} strong />
              <a
                className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white"
                href={`/api/anni-abrechnung/settlement?year=${year}&month=${month}`}
              >
                <Download className="h-4 w-4" /> Monats-PDF
              </a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Jahr {year}</CardTitle>
              <CardDescription>Pool läuft über Jahresgrenzen weiter und setzt sich nie automatisch zurück.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Einnahmen bezahlt" value={formatNetEur(yearSummary.paidIncomeCents)} />
              <Row label="20 % Soll" value={formatNetEur(yearSummary.feeSollCents)} />
              <Row label="20 % bereits abgerechnet" value={formatNetEur(yearSummary.feeBereitsCents)} />
              <Row label="Pool Zugang / Abgang" value={`${formatNetEur(yearSummary.poolInCents)} / ${formatNetEur(yearSummary.poolOutTravelCents)}`} />
              <Row label="Ausschüttungen an Anni" value={formatNetEur(yearSummary.poolPayoutAnniCents)} />
              <Row label="Pool-Saldo (gesamt)" value={formatNetEur(yearSummary.poolSaldoCents)} strong />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Nächste offene Rechnungen</CardTitle>
            </CardHeader>
            <CardContent>
              {incomeRows.filter((r) => r.status !== "bezahlt").slice(0, 8).length === 0 ? (
                <EmptyState>Keine offenen Forderungen.</EmptyState>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2">Job</th>
                        <th>Fällig</th>
                        <th>Status</th>
                        <th className="text-right">Netto 20 %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeRows
                        .filter((r) => r.status !== "bezahlt")
                        .slice(0, 8)
                        .map((r) => (
                          <tr key={r.job.id} className={r.status === "überfällig" ? "bg-rose-50" : ""}>
                            <td className="py-2 font-medium text-fc-navy">{r.job.label}</td>
                            <td>{formatIsoDateDe(r.job.invoice_due_date)}</td>
                            <td>
                              <Badge variant={STATUS_VARIANT[r.status]}>{INVOICE_STATUS_LABELS[r.status]}</Badge>
                            </td>
                            <td className="text-right tabular-nums">{formatNetEur(r.incomeCents)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "jobs" ? (
        <JobsSection
          jobs={jobs}
          todayIso={todayIso}
          pending={pending}
          onNew={() => setEditing("new")}
          onEdit={setEditing}
          onDelete={(id) => {
            startTransition(async () => {
              const res = await deleteAnniMgmtJobAction(id);
              flash(res.ok ? "Job gelöscht." : null, res.ok ? null : res.error);
              router.refresh();
            });
          }}
        />
      ) : null}

      {tab === "einnahmen" ? (
        <Card>
          <CardHeader>
            <CardTitle>Einnahmen-Übersicht</CardTitle>
            <CardDescription>
              Abgeleitet aus Jobs. 20 % nur bei bezahlt, Monat = Zahlungsdatum.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {incomeRows.length === 0 ? (
              <EmptyState>Noch keine Jobs.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2">Datum</th>
                      <th>Job</th>
                      <th>Status</th>
                      <th className="text-right">Einnahmen</th>
                      <th className="text-right">Kundenreise</th>
                      <th className="text-right">Extra-Spesen</th>
                      <th className="text-right">20 %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeRows.map((r) => (
                      <tr
                        key={r.job.id}
                        className={cn("border-t", r.status === "überfällig" && "bg-rose-50")}
                      >
                        <td className="py-2">{formatIsoDateDe(r.sortDate)}</td>
                        <td className="font-medium">{r.job.label}</td>
                        <td>
                          <Badge variant={STATUS_VARIANT[r.status]}>{INVOICE_STATUS_LABELS[r.status]}</Badge>
                        </td>
                        <td className="text-right tabular-nums">{formatNetEur(r.incomeCents)}</td>
                        <td className="text-right tabular-nums">{formatNetEur(r.travelToClientCents)}</td>
                        <td className="text-right tabular-nums">{formatNetEur(r.extraSpesenCents)}</td>
                        <td className="text-right tabular-nums">{formatNetEur(r.feeCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "monat" ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <CardTitle>Monatliche Abrechnung</CardTitle>
                <CardDescription>{QUARTER_RULE_COPY}</CardDescription>
              </div>
              <MonthYearPicker years={years} year={year} month={month} onYear={setYear} onMonth={setMonth} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Einnahmen bezahlt" value={formatNetEur(monthPreview.paidIncomeBaseCents)} />
              <Stat label="20 % Honorar" value={formatNetEur(monthPreview.feeCents)} />
              <Stat
                label={monthPreview.isQuarterMonth ? "Management-Reise fällig" : "Management-Reise"}
                value={formatNetEur(monthPreview.managementTravelCents)}
              />
              <Stat label="Rechnung Management" value={formatNetEur(monthPreview.totalInvoiceCents)} accent />
            </div>
            {monthPreview.isQuarterMonth && monthPreview.managementTravelLines.length > 0 ? (
              <div className="rounded-2xl border bg-slate-50 p-3">
                <p className="text-sm font-semibold text-fc-navy">Offene Management-Reisekosten</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {monthPreview.managementTravelLines.map((l) => (
                    <li key={l.id} className="flex justify-between gap-3">
                      <span>
                        {formatIsoDateDe(l.jobDate)} · {l.jobLabel} ·{" "}
                        {l.travel_mode ? TRAVEL_MODE_LABELS[l.travel_mode] : "Reise"}
                      </span>
                      <span className="tabular-nums">{formatNetEur(l.amount_cents)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white"
                href={`/api/anni-abrechnung/settlement?year=${year}&month=${month}`}
              >
                <Download className="h-4 w-4" /> PDF herunterladen
              </a>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await settleAnniMgmtMonthAction({ year, month });
                    flash(
                      res.ok
                        ? "Monat als abgerechnet markiert. Enthaltene Management-Reise gilt als ausgeglichen."
                        : null,
                      res.ok ? null : res.error,
                    );
                    router.refresh();
                  });
                }}
                className="h-11 rounded-xl border px-4 text-sm font-semibold"
              >
                {settledThisMonth ? "Abrechnung aktualisieren" : "Mit monatlicher Abrechnung erfasst"}
              </button>
              {monthPreview.managementTravelLines.length > 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await markManagementTravelReimbursedAction({
                        lineIds: monthPreview.managementTravelLines.map((l) => l.id),
                        year,
                        month,
                      });
                      flash(res.ok ? "Management-Reise als ausgeglichen markiert." : null, res.ok ? null : res.error);
                      router.refresh();
                    });
                  }}
                  className="h-11 rounded-xl border px-4 text-sm font-semibold"
                >
                  Nur Reise als ausgeglichen
                </button>
              ) : null}
            </div>
            {settledThisMonth ? (
              <p className="text-xs text-slate-500">
                Zuletzt abgerechnet am {formatIsoDateDe(settledThisMonth.settled_at)} ·{" "}
                {formatNetEur(settledThisMonth.total_cents)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "jahr" ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <CardTitle>Jahresübersicht</CardTitle>
                <CardDescription>Pool-Saldo ist der laufende Stand über alle Jahre.</CardDescription>
              </div>
              <select className={fieldClass() + " w-32"} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Row label="Einnahmen bezahlt" value={formatNetEur(yearSummary.paidIncomeCents)} />
            <Row label="Noch offen / überfällig" value={`${formatNetEur(yearSummary.unpaidIncomeCents)} / ${formatNetEur(yearSummary.overdueIncomeCents)}`} />
            <Row label="20 % Soll" value={formatNetEur(yearSummary.feeSollCents)} />
            <Row label="20 % bereits" value={formatNetEur(yearSummary.feeBereitsCents)} />
            <Row label="Pool IN (Kundenreise bezahlt)" value={formatNetEur(yearSummary.poolInCents)} />
            <Row label="Pool OUT (Reisen)" value={formatNetEur(yearSummary.poolOutTravelCents)} />
            <Row label="Ausschüttungen an Anni" value={formatNetEur(yearSummary.poolPayoutAnniCents)} />
            <Row label="Pool-Saldo gesamt" value={formatNetEur(yearSummary.poolSaldoCents)} strong />
          </CardContent>
        </Card>
      ) : null}

      {tab === "pool" ? (
        <PoolSection
          movements={movements}
          saldo={poolSaldo}
          pending={pending}
          onPayout={(payload) => {
            startTransition(async () => {
              const res = await addPoolPayoutAction(payload);
              flash(res.ok ? "Ausschüttung gespeichert." : null, res.ok ? null : res.error);
              router.refresh();
            });
          }}
          onDeletePayout={(id) => {
            startTransition(async () => {
              const res = await deletePoolPayoutAction(id);
              flash(res.ok ? "Eintrag gelöscht." : null, res.ok ? null : res.error);
              router.refresh();
            });
          }}
        />
      ) : null}

      {tab === "team" && canInvite ? (
        <TeamSection
          people={people}
          pending={pending}
          onInvite={(payload) => {
            startTransition(async () => {
              const res = await inviteAnniManagementUserAction(payload);
              flash(
                res.ok ? "Einladung gesendet. Der Link bleibt gültig, bis das Passwort gesetzt ist." : null,
                res.ok ? null : res.error,
              );
              router.refresh();
            });
          }}
          onResend={(id) => {
            startTransition(async () => {
              const res = await resendAnniManagementInviteAction(id);
              flash(res.ok ? "Neuer Link gesendet (alter Link ist ungültig)." : null, res.ok ? null : res.error);
            });
          }}
        />
      ) : null}

      {editing ? (
        <JobEditor
          job={editing === "new" ? null : editing}
          incomeTypes={incomeTypes}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(payload) => {
            startTransition(async () => {
              const res = await saveAnniMgmtJobAction(payload);
              if (!res.ok) {
                flash(null, res.error);
                return;
              }
              flash("Job gespeichert.", null);
              setEditing(null);
              router.refresh();
            });
          }}
          onAddIncomeType={(label) => {
            startTransition(async () => {
              await addIncomeTypeAction(label);
              router.refresh();
            });
          }}
        />
      ) : null}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-slate-600">{label}</span>
      <span className={cn("tabular-nums", strong && "text-base font-semibold text-fc-navy")}>{value}</span>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-3", accent && "border-fc-navy/20 bg-fc-ice")}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-fc-navy">{value}</div>
    </div>
  );
}

function MonthYearPicker({
  years,
  year,
  month,
  onYear,
  onMonth,
}: {
  years: number[];
  year: number;
  month: number;
  onYear: (y: number) => void;
  onMonth: (m: number) => void;
}) {
  return (
    <div className="flex gap-2">
      <select className={fieldClass() + " w-28"} value={month} onChange={(e) => onMonth(Number(e.target.value))}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>
            {monthTitleDe(2000, m).replace(" 2000", "")}
          </option>
        ))}
      </select>
      <select className={fieldClass() + " w-28"} value={year} onChange={(e) => onYear(Number(e.target.value))}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

function JobsSection({
  jobs,
  todayIso,
  pending,
  onNew,
  onEdit,
  onDelete,
}: {
  jobs: AnniMgmtJob[];
  todayIso: string;
  pending: boolean;
  onNew: () => void;
  onEdit: (job: AnniMgmtJob) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Jobs</CardTitle>
          <CardDescription>Auftritt, Rechnung, Positionen. Standard: 500 € Reise an den Kunden (änderbar).</CardDescription>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Neuer Job
        </button>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <EmptyState>Noch keine Jobs. Lege den ersten Auftritt an.</EmptyState>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const status = invoiceStatus(job, todayIso);
              return (
                <div
                  key={job.id}
                  className={cn(
                    "rounded-2xl border p-4",
                    status === "überfällig" && "border-rose-200 bg-rose-50/70",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-fc-navy">{job.label}</h3>
                        <Badge variant={STATUS_VARIANT[status]}>{INVOICE_STATUS_LABELS[status]}</Badge>
                        {status === "überfällig" ? <AlertTriangle className="h-4 w-4 text-rose-600" /> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Auftritt {formatIsoDateDe(job.performance_date)} · Rechnung fällig{" "}
                        {formatIsoDateDe(job.invoice_due_date)}
                        {job.paid_at ? ` · bezahlt ${formatIsoDateDe(job.paid_at)}` : ""}
                      </p>
                      {job.description ? <p className="mt-1 text-sm text-slate-600">{job.description}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="grid h-10 w-10 place-items-center rounded-xl border" onClick={() => onEdit(job)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        className="grid h-10 w-10 place-items-center rounded-xl border text-rose-700"
                        onClick={() => {
                          if (confirm("Job wirklich löschen?")) onDelete(job.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {job.lines.map((line) => (
                      <li key={line.id} className="flex justify-between gap-3">
                        <span className="text-slate-600">
                          {JOB_LINE_KIND_LABELS[line.line_kind]}
                          {line.income_type ? ` · ${line.income_type}` : ""}
                          {line.traveler ? ` · ${TRAVELER_LABELS[line.traveler]}` : ""}
                          {line.travel_mode ? ` · ${TRAVEL_MODE_LABELS[line.travel_mode]}` : ""}
                          {line.km ? ` · ${line.km} km` : ""}
                        </span>
                        <span className="tabular-nums">{formatNetEur(line.amount_cents)}</span>
                      </li>
                    ))}
                  </ul>
                  <InvoicePdfRow job={job} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InvoicePdfRow({ job }: { job: AnniMgmtJob }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("jobId", job.id);
      const res = await fetch("/api/anni-abrechnung/invoice", { method: "POST", body: form });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload fehlgeschlagen");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function openPdf() {
    if (!job.invoice_pdf_path) return;
    const res = await fetch(`/api/anni-abrechnung/invoice?path=${encodeURIComponent(job.invoice_pdf_path)}`);
    const json = (await res.json()) as { url?: string; error?: string };
    if (!json.url) throw new Error(json.error ?? "PDF nicht gefunden");
    window.open(json.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
      {job.invoice_pdf_path ? (
        <button type="button" onClick={() => void openPdf()} className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium">
          <FileText className="h-4 w-4" /> Rechnungs-PDF öffnen
        </button>
      ) : (
        <span className="text-sm text-slate-500">Noch kein Rechnungs-PDF.</span>
      )}
      <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium">
        <Upload className="h-4 w-4" />
        {busy ? "Lade…" : "PDF hochladen"}
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function PoolSection({
  movements,
  saldo,
  pending,
  onPayout,
  onDeletePayout,
}: {
  movements: ReturnType<typeof poolMovements>;
  saldo: number;
  pending: boolean;
  onPayout: (input: { payout_date: string; amount_eur: string; note?: string }) => void;
  onDeletePayout: (id: string) => void;
}) {
  const [date, setDate] = useState(berlinTodayIsoDate());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("Ausschüttung an Anni");
  let running = 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardHeader>
          <CardTitle>Bewegungen</CardTitle>
          <CardDescription>
            Zugang: verrechnete Reise an den Kunden (nach Zahlung). Abgang: echte Reisen von Anni und Management.
            Der Pool setzt sich nie automatisch zurück.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm font-semibold text-fc-navy">Saldo {formatNetEur(saldo)}</p>
          {movements.length === 0 ? (
            <EmptyState>Noch keine Pool-Bewegungen.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2">Datum</th>
                    <th>Wer</th>
                    <th>Text</th>
                    <th className="text-right">Betrag</th>
                    <th className="text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    running += m.direction === "in" ? m.amount_cents : -m.amount_cents;
                    return (
                      <tr key={`${m.kind}-${m.id}`} className="border-t">
                        <td className="py-2">{formatIsoDateDe(m.date)}</td>
                        <td>{m.who}</td>
                        <td>
                          {m.label}
                          {m.kind === "payout_anni" ? (
                            <button
                              type="button"
                              className="ml-2 text-xs text-rose-700"
                              disabled={pending}
                              onClick={() => onDeletePayout(m.id)}
                            >
                              löschen
                            </button>
                          ) : null}
                        </td>
                        <td className={cn("text-right tabular-nums", m.direction === "out" && "text-rose-700")}>
                          {m.direction === "out" ? "−" : "+"}
                          {formatNetEur(m.amount_cents)}
                        </td>
                        <td className="text-right tabular-nums">{formatNetEur(running)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ausschüttung an Anni</CardTitle>
          <CardDescription>Wenn der Pool zu hoch wird — nur nach Absprache.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <label className="grid gap-1 text-sm">
            Datum
            <input type="date" className={fieldClass()} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Betrag netto (€)
            <input
              className={fieldClass()}
              {...decimalInputProps()}
              value={amount}
              onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Hinweis
            <input className={fieldClass()} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => onPayout({ payout_date: date, amount_eur: amount, note })}
            className="h-11 rounded-xl bg-fc-navy text-sm font-semibold text-white"
          >
            Ausschüttung buchen
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamSection({
  people,
  pending,
  onInvite,
  onResend,
}: {
  people: AnniMgmtPerson[];
  pending: boolean;
  onInvite: (input: { name: string; email: string }) => void;
  onResend: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Zugang</CardTitle>
          <CardDescription>Nur Anni, Peter und Management. Vorstand sieht dieses Modul nicht.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {people.length === 0 ? (
            <EmptyState>Noch keine Personen mit Flag geladen.</EmptyState>
          ) : (
            people.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
                <div>
                  <div className="font-medium">
                    {p.first_name} {p.last_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.email || "keine E-Mail"} · {p.role === "anni" ? "Anni" : p.is_management ? "Management (versteckt)" : "Peter"}
                  </div>
                </div>
                {p.is_management && p.email ? (
                  <button type="button" disabled={pending} className="text-xs font-semibold text-fc-blue" onClick={() => onResend(p.id)}>
                    Link erneut
                  </button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Person hinzufügen</CardTitle>
          <CardDescription>
            Legt ein verstecktes Management-Konto an. Einladung per E-Mail (Club-Link, gültig bis Passwort gesetzt).
            Ohne E-Mail kein Login-Versand.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <label className="grid gap-1 text-sm">
            Name
            <input className={fieldClass()} value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Jo Nachname" />
          </label>
          <label className="grid gap-1 text-sm">
            E-Mail
            <input className={fieldClass()} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => onInvite({ name, email })}
            className="h-11 rounded-xl bg-fc-navy text-sm font-semibold text-white"
          >
            Einladen
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function JobEditor({
  job,
  incomeTypes,
  pending,
  onClose,
  onSave,
  onAddIncomeType,
}: {
  job: AnniMgmtJob | null;
  incomeTypes: string[];
  pending: boolean;
  onClose: () => void;
  onSave: (payload: Parameters<typeof saveAnniMgmtJobAction>[0]) => void;
  onAddIncomeType: (label: string) => void;
}) {
  const today = berlinTodayIsoDate();
  const [performanceDate, setPerformanceDate] = useState(job?.performance_date ?? today);
  const [label, setLabel] = useState(job?.label ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [dueDate, setDueDate] = useState(job?.invoice_due_date ?? today);
  const [sent, setSent] = useState(job?.invoice_sent ?? false);
  const [sentAt, setSentAt] = useState(job?.invoice_sent_at ?? "");
  const [paid, setPaid] = useState(job?.paid ?? false);
  const [paidAt, setPaidAt] = useState(job?.paid_at ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    job?.lines.length
      ? job.lines.map(lineToDraft)
      : [emptyIncomeLine(), emptyTravelToClientLine()],
  );
  const [customType, setCustomType] = useState("");

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function resolvedAmount(line: DraftLine): number {
    if (line.line_kind === "expense_travel" && line.travel_mode === "auto") {
      const km = Number(line.km.replace(",", "."));
      return autoKmNetCents(km);
    }
    return centsFromEurField(line.amount_eur);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-fc-navy/40 p-0 sm:items-center sm:p-6">
      <div className="max-h-[96dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-fc-navy">{job ? "Job bearbeiten" : "Neuer Job"}</h2>
            <p className="text-sm text-slate-600">Alle Beträge netto. 20 % nur auf Einnahmen-Zeilen.</p>
          </div>
          <button type="button" className="rounded-xl border px-3 py-2 text-sm" onClick={onClose}>
            Schließen
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Auftritt / Leistung
            <input type="date" className={fieldClass()} value={performanceDate} onChange={(e) => setPerformanceDate(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Fälligkeit Rechnung
            <input type="date" className={fieldClass()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Zuordnung (Kunde, Ort, Titel)
            <input className={fieldClass()} value={label} onChange={(e) => setLabel(e.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Beschreibung / Info
            <textarea
              className="min-h-20 rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sent} onChange={(e) => setSent(e.target.checked)} />
            Rechnung versendet
          </label>
          {sent ? (
            <label className="grid gap-1 text-sm">
              Versanddatum
              <input type="date" className={fieldClass()} value={sentAt} onChange={(e) => setSentAt(e.target.value)} />
            </label>
          ) : (
            <div />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            Bezahlt
          </label>
          {paid ? (
            <label className="grid gap-1 text-sm">
              Zahlungsdatum (Monat der 20 %)
              <input type="date" className={fieldClass()} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </label>
          ) : (
            <div />
          )}
        </div>

        <h3 className="mt-6 text-sm font-semibold text-fc-navy">Positionen</h3>
        <div className="mt-2 space-y-3">
          {lines.map((line) => (
            <div key={line.key} className="rounded-2xl border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Art
                  <select
                    className={fieldClass()}
                    value={line.line_kind}
                    onChange={(e) => updateLine(line.key, { line_kind: e.target.value as JobLineKind })}
                  >
                    {Object.entries(JOB_LINE_KIND_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                {line.line_kind === "income" ? (
                  <label className="grid gap-1 text-sm">
                    Einnahme-Art
                    <select
                      className={fieldClass()}
                      value={line.income_type}
                      onChange={(e) => updateLine(line.key, { income_type: e.target.value })}
                    >
                      {incomeTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {line.line_kind === "expense_travel" || line.line_kind === "expense_other" ? (
                  <label className="grid gap-1 text-sm">
                    Wer
                    <select
                      className={fieldClass()}
                      value={line.traveler}
                      onChange={(e) => updateLine(line.key, { traveler: e.target.value as Traveler })}
                    >
                      <option value="anni">{TRAVELER_LABELS.anni}</option>
                      <option value="management">{TRAVELER_LABELS.management}</option>
                    </select>
                  </label>
                ) : null}
                {line.line_kind === "expense_travel" ? (
                  <label className="grid gap-1 text-sm">
                    Reiseart
                    <select
                      className={fieldClass()}
                      value={line.travel_mode}
                      onChange={(e) => updateLine(line.key, { travel_mode: e.target.value as TravelMode })}
                    >
                      {TRAVEL_MODES.map((m) => (
                        <option key={m} value={m}>
                          {TRAVEL_MODE_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {line.line_kind === "expense_travel" && line.travel_mode === "auto" ? (
                  <>
                    <label className="grid gap-1 text-sm">
                      Kilometer
                      <input
                        className={fieldClass()}
                        {...decimalInputProps()}
                        value={line.km}
                        onChange={(e) => updateLine(line.key, { km: sanitizeDecimalInput(e.target.value) })}
                      />
                    </label>
                    <label className="grid gap-1 text-sm sm:col-span-2">
                      Strecke / Beschreibung
                      <input
                        className={fieldClass()}
                        value={line.route_description}
                        onChange={(e) => updateLine(line.key, { route_description: e.target.value })}
                        placeholder="z. B. Berlin → Hamburg"
                      />
                    </label>
                    <p className="sm:col-span-2 text-sm text-slate-600">
                      Rechnung: {line.km || "0"} km × 0,33 € ={" "}
                      <strong>{formatNetEur(autoKmNetCents(Number(line.km.replace(",", ".")) || 0))}</strong>
                    </p>
                  </>
                ) : (
                  <label className="grid gap-1 text-sm">
                    Betrag netto (€)
                    <input
                      className={fieldClass()}
                      {...decimalInputProps()}
                      value={line.amount_eur}
                      onChange={(e) => updateLine(line.key, { amount_eur: sanitizeDecimalInput(e.target.value) })}
                    />
                  </label>
                )}
              </div>
              <div className="mt-2 flex justify-end">
                <button type="button" className="text-xs font-semibold text-rose-700" onClick={() => setLines((p) => p.filter((l) => l.key !== line.key))}>
                  Position entfernen
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="h-10 rounded-xl border px-3 text-sm" onClick={() => setLines((p) => [...p, emptyIncomeLine()])}>
            + Einnahme
          </button>
          <button type="button" className="h-10 rounded-xl border px-3 text-sm" onClick={() => setLines((p) => [...p, emptyTravelToClientLine()])}>
            + Kundenreise
          </button>
          <button
            type="button"
            className="h-10 rounded-xl border px-3 text-sm"
            onClick={() =>
              setLines((p) => [
                ...p,
                {
                  ...emptyIncomeLine(),
                  line_kind: "extra_client_spesen",
                  income_type: "",
                },
              ])
            }
          >
            + Extra-Spesen Kunde
          </button>
          <button type="button" className="h-10 rounded-xl border px-3 text-sm" onClick={() => setLines((p) => [...p, emptyExpenseTravel("anni")])}>
            + Reise Anni
          </button>
          <button
            type="button"
            className="h-10 rounded-xl border px-3 text-sm"
            onClick={() => setLines((p) => [...p, emptyExpenseTravel("management")])}
          >
            + Reise Management
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className={fieldClass()}
            placeholder="Weitere Einnahme-Art"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
          />
          <button
            type="button"
            className="h-11 shrink-0 rounded-xl border px-3 text-sm"
            onClick={() => {
              if (!customType.trim()) return;
              onAddIncomeType(customType.trim());
              setCustomType("");
            }}
          >
            Art merken
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="h-11 rounded-xl border px-4 text-sm" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            disabled={pending}
            className="h-11 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() =>
              onSave({
                id: job?.id,
                performance_date: performanceDate,
                label,
                description,
                invoice_due_date: dueDate,
                invoice_sent: sent,
                invoice_sent_at: sent ? sentAt || performanceDate : null,
                paid,
                paid_at: paid ? paidAt || today : null,
                addDefaultTravelToClient: !job,
                lines: lines.map((l) => ({
                  id: l.id,
                  line_kind: l.line_kind,
                  income_type: l.income_type,
                  amount_cents: resolvedAmount(l),
                  traveler: l.traveler,
                  travel_mode: l.travel_mode,
                  km: l.travel_mode === "auto" ? Number(l.km.replace(",", ".")) || null : null,
                  route_description: l.route_description || null,
                  note: l.note || null,
                })),
              })
            }
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
