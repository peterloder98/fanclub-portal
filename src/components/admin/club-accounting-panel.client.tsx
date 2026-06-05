"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addClubLedgerEntry,
  deleteClubLedgerEntry,
} from "@/app/(app)/admin/members/detail-actions";
import {
  filterLedgerByPeriod,
  formatEur,
  ledgerYearOptions,
  LEDGER_CATEGORY_LABELS,
  sumLedgerRows,
  type ClubLedgerRow,
  type LedgerCategory,
  type LedgerPeriodMode,
} from "@/lib/club/ledger";

const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

function formatDE(date: string | null) {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

export function ClubAccountingPanel({
  entries,
  ledgerAvailable,
}: {
  entries: ClubLedgerRow[];
  ledgerAvailable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [periodMode, setPeriodMode] = useState<LedgerPeriodMode>("all");
  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [ledgerType, setLedgerType] = useState<"income" | "expense">("income");
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerDesc, setLedgerDesc] = useState("");
  const [ledgerCategory, setLedgerCategory] = useState<LedgerCategory>("general");
  const [ledgerDate, setLedgerDate] = useState(now.toISOString().slice(0, 10));

  const yearOptions = useMemo(() => ledgerYearOptions(entries), [entries]);

  const filteredEntries = useMemo(
    () => filterLedgerByPeriod(entries, periodMode, filterYear, filterMonth),
    [entries, periodMode, filterYear, filterMonth],
  );

  const { incomeCents, expenseCents } = useMemo(
    () => sumLedgerRows(filteredEntries),
    [filteredEntries],
  );
  const balance = incomeCents - expenseCents;

  const periodLabel =
    periodMode === "all"
      ? "Gesamt"
      : periodMode === "year"
        ? `Jahr ${filterYear}`
        : `${MONTHS[filterMonth - 1]} ${filterYear}`;

  function handleAdd() {
    const amount = Number(ledgerAmount.replace(",", "."));
    if (!ledgerDesc.trim() || !amount || amount <= 0) return;
    setError(null);
    startTransition(async () => {
      try {
        await addClubLedgerEntry({
          entryType: ledgerType,
          amountEur: amount,
          description: ledgerDesc.trim(),
          category: ledgerCategory,
          memberId: null,
          entryDate: ledgerDate,
        });
        setLedgerAmount("");
        setLedgerDesc("");
        setShowAddForm(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Eintrag fehlgeschlagen");
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Eintrag löschen?")) return;
    startTransition(async () => {
      try {
        await deleteClubLedgerEntry(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
      }
    });
  }

  if (!ledgerAvailable) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-amber-800">
          Buchhaltung noch nicht eingerichtet. Bitte{" "}
          <code className="rounded bg-amber-100 px-1">supabase/049_club_ledger.sql</code> im SQL
          Editor ausführen.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-600">Zeitraum</span>
            <select
              value={periodMode}
              onChange={(e) => setPeriodMode(e.target.value as LedgerPeriodMode)}
              className="h-10 rounded-xl border px-3 text-sm"
            >
              <option value="all">Gesamt</option>
              <option value="year">Pro Jahr</option>
              <option value="month">Pro Monat</option>
            </select>
          </label>
          {periodMode !== "all" ? (
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-600">Jahr</span>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="h-10 rounded-xl border px-3 text-sm"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {periodMode === "month" ? (
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-600">Monat</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="h-10 rounded-xl border px-3 text-sm"
              >
                {MONTHS.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <p className="text-sm text-slate-500">{periodLabel}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase text-slate-500">Einnahmen</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{formatEur(incomeCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase text-slate-500">Ausgaben</p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{formatEur(expenseCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase text-slate-500">Saldo</p>
            <p
              className={`mt-1 text-2xl font-bold ${balance >= 0 ? "text-slate-900" : "text-rose-700"}`}
            >
              {formatEur(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Neue Buchung</CardTitle>
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="h-9 rounded-lg border bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Neuen Eintrag anlegen
            </button>
          ) : null}
        </CardHeader>
        {showAddForm ? (
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <select
                value={ledgerType}
                onChange={(e) => setLedgerType(e.target.value as "income" | "expense")}
                className="h-10 rounded-xl border px-3 text-sm"
              >
                <option value="income">Einnahme</option>
                <option value="expense">Ausgabe</option>
              </select>
              <select
                value={ledgerCategory}
                onChange={(e) => setLedgerCategory(e.target.value as LedgerCategory)}
                className="h-10 rounded-xl border px-3 text-sm"
              >
                {Object.entries(LEDGER_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                value={ledgerAmount}
                onChange={(e) => setLedgerAmount(e.target.value)}
                placeholder="Betrag (€)"
                className="h-10 rounded-xl border px-3 text-sm"
              />
              <input
                type="date"
                value={ledgerDate}
                onChange={(e) => setLedgerDate(e.target.value)}
                className="h-10 rounded-xl border px-3 text-sm"
              />
              <input
                value={ledgerDesc}
                onChange={(e) => setLedgerDesc(e.target.value)}
                placeholder="Beschreibung"
                className="h-10 rounded-xl border px-3 text-sm sm:col-span-2"
              />
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <button
                  type="button"
                  disabled={pending || !ledgerDesc.trim() || !ledgerAmount}
                  onClick={handleAdd}
                  className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Speichern
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setShowAddForm(false)}
                  className="h-10 rounded-xl border px-4 text-sm font-semibold text-slate-600"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buchungen ({filteredEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Einträge in diesem Zeitraum.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Datum</th>
                    <th className="px-3 py-2">Art</th>
                    <th className="px-3 py-2">Betrag</th>
                    <th className="px-3 py-2">Kategorie</th>
                    <th className="px-3 py-2">Beschreibung</th>
                    <th className="px-3 py-2">Mitglied</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="px-3 py-2">{formatDE(e.entry_date)}</td>
                      <td className="px-3 py-2">
                        {e.entry_type === "income" ? "Einnahme" : "Ausgabe"}
                      </td>
                      <td
                        className={`px-3 py-2 font-semibold tabular-nums ${e.entry_type === "income" ? "text-emerald-700" : "text-rose-700"}`}
                      >
                        {e.entry_type === "income" ? "+" : "−"}
                        {formatEur(e.amount_cents)}
                      </td>
                      <td className="px-3 py-2">{LEDGER_CATEGORY_LABELS[e.category]}</td>
                      <td className="px-3 py-2">{e.description}</td>
                      <td className="px-3 py-2">
                        {e.member_id ? (
                          <Link
                            href={`/admin/members/${e.member_id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {e.member_name ?? "Mitglied"}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleDelete(e.id)}
                          className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-50"
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
