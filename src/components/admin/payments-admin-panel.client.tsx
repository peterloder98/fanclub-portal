"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatEur } from "@/lib/club/ledger";
import { formatBerlinDate } from "@/lib/datetime/berlin";
import { membershipFeeCountsInAccountingBalance } from "@/lib/club/accounting-settings";
import { paymentStatusBadgeClass } from "@/lib/payments/labels";
import type { PaymentStatus } from "@/lib/payments/types";
import {
  cancelPaymentAction,
  confirmPaymentAction,
  listAdminPaymentsAction,
  updatePaymentFieldsAction,
  type AdminPaymentRow,
} from "@/app/(app)/admin/payments/actions";
import { decimalInputProps, sanitizeDecimalInput } from "@/lib/input/decimal-input";

const FILTERS: Array<{ id: PaymentStatus | "all"; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "open", label: "Offen" },
  { id: "simulated", label: "Simuliert" },
  { id: "pending", label: "Ausstehend" },
  { id: "paid", label: "Bezahlt" },
  { id: "cancelled", label: "Storniert" },
];

function centsToEurInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function parseEurToCents(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export function PaymentsAdminPanel({
  initialPayments,
  highlightPaymentId = null,
  accountingStartDate = null,
}: {
  initialPayments: AdminPaymentRow[];
  highlightPaymentId?: string | null;
  accountingStartDate?: string | null;
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [filter, setFilter] = useState<PaymentStatus | "all">("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [amountEur, setAmountEur] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === "all") return payments;
    return payments.filter((p) => p.payment_status === filter);
  }, [payments, filter]);

  const selected = payments.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!highlightPaymentId) return;
    const row = payments.find((p) => p.id === highlightPaymentId);
    if (!row) return;
    setFilter("all");
    setSelectedId(highlightPaymentId);
    setNote(row.admin_note ?? "");
    setReceiptRef(row.receipt_reference ?? "");
    setReceiptDate("");
    setAmountEur(centsToEurInput(row.amount_cents));
  }, [highlightPaymentId, payments]);

  const receiptAffectsBalance = useMemo(() => {
    if (!receiptDate.trim()) return null;
    return membershipFeeCountsInAccountingBalance({
      entryDate: receiptDate.trim(),
      accountingStartDate,
    });
  }, [receiptDate, accountingStartDate]);

  function reload(status: PaymentStatus | "all" = filter) {
    startTransition(async () => {
      try {
        const rows = await listAdminPaymentsAction({ status });
        setPayments(rows);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      }
    });
  }

  function onSelect(p: AdminPaymentRow) {
    setSelectedId(p.id);
    setNote(p.admin_note ?? "");
    setReceiptRef(p.receipt_reference ?? "");
    setReceiptDate("");
    setAmountEur(centsToEurInput(p.amount_cents));
    setSuccess(null);
  }

  function confirm() {
    if (!selected) return;
    if (!receiptDate.trim()) {
      setError("Bitte Zahlungseingang am eintragen.");
      return;
    }
    const amountCents = parseEurToCents(amountEur);
    if (amountCents == null) {
      setError("Bitte den tatsächlichen Betrag in Euro eintragen.");
      return;
    }
    const confirmed = selected;
    startTransition(async () => {
      try {
        const result = await confirmPaymentAction({
          paymentId: confirmed.id,
          receiptDate: receiptDate.trim(),
          amountCents,
          note,
          receiptReference: receiptRef,
        });
        reload();
        setSelectedId(null);
        setReceiptDate("");
        setAmountEur("");
        setError(null);
        const amountLabel = formatEur(result.amountCents ?? amountCents);
        const yearsHint =
          result.yearsCovered && result.yearsCovered >= 2
            ? ` (${result.yearsCovered} Jahre Beitrag)`
            : "";
        if (result.admissionError) {
          setSuccess(
            `${amountLabel} als bezahlt markiert${yearsHint}. Aufnahme als Mitglied fehlgeschlagen: ${result.admissionError}`,
          );
        } else if (result.activated) {
          const nr = result.assignedNumber ? ` Mitgliedsnummer ${result.assignedNumber}.` : "";
          const mail =
            result.inviteEmailOk === false
              ? " Willkommens-E-Mail konnte nicht gesendet werden."
              : result.inviteEmailOk
                ? " Willkommens-E-Mail mit App-Zugang ist raus."
                : "";
          setSuccess(
            `${amountLabel} bestätigt${yearsHint} — Mitglied aufgenommen.${nr}${mail}`,
          );
        } else {
          setSuccess(
            `${amountLabel} als bezahlt markiert${yearsHint} (${confirmed.payment_method_label}, ${confirmed.payment_type_label}).`,
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bestätigung fehlgeschlagen");
      }
    });
  }

  function cancel() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await cancelPaymentAction({ paymentId: selected.id, note });
        reload();
        setSelectedId(null);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Storno fehlgeschlagen");
      }
    });
  }

  function saveNote() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await updatePaymentFieldsAction({
          paymentId: selected.id,
          note,
          receiptReference: receiptRef,
        });
        reload();
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Zahlungen</h1>
        <p className="mt-1 text-sm text-slate-600">
          Offene Posten werden manuell geprüft. Bei einem Erstbeitrag neuer Anträge wird die
          Person mit der Bestätigung automatisch aufgenommen (aktive Mitgliedschaft und nächste
          Mitgliedsnummer).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFilter(f.id);
              reload(f.id);
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold",
              filter === f.id
                ? "border-fc-navy bg-fc-navy text-white"
                : "border-slate-200 bg-white text-slate-700",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {success}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Mitglied</th>
                <th className="px-3 py-2">Art</th>
                <th className="px-3 py-2">Betrag</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelect(p)}
                    className={cn(
                      "cursor-pointer border-b hover:bg-fc-ice/40",
                      selectedId === p.id && "bg-fc-ice/60",
                    )}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                      {formatBerlinDate(p.created_at)}
                    </td>
                    <td className="px-3 py-2">{p.member_name}</td>
                    <td className="px-3 py-2 text-xs">
                      {p.payment_type_label}
                      <br />
                      <span className="text-slate-500">{p.payment_method_label}</span>
                    </td>
                    <td className="px-3 py-2 font-semibold">{formatEur(p.amount_cents)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          paymentStatusBadgeClass(p.payment_status),
                        )}
                      >
                        {p.payment_status_label}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    Keine Zahlungen in dieser Ansicht.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-2 rounded-xl border bg-white p-4">
          {selected ? (
            <div className="space-y-3">
              <h2 className="font-bold text-slate-900">Zahlungsdetails</h2>
              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Interne Referenz (Buchhaltung)</dt>
                  <dd className="font-mono text-xs font-semibold">{selected.internal_reference}</dd>
                </div>
                {selected.payment_type === "membership_fee" || selected.application_id ? (
                  <div>
                    <dt className="text-xs text-slate-500">
                      Verwendungszweck (für Mitglied)
                    </dt>
                    <dd className="text-xs font-semibold text-slate-800">
                      {selected.member_name && selected.member_name !== "—"
                        ? `Mitgliedsbeitrag / ${selected.member_name}`
                        : "Mitgliedsbeitrag / Vorname Nachname"}
                      <span className="mt-0.5 block font-normal text-slate-500">
                        So in Bestätigungs-Mail und Antrag — nicht die interne Referenz.
                      </span>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-slate-500">Betrag (Vorschlag)</dt>
                  <dd className="font-semibold">{formatEur(selected.amount_cents)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Zahlungsart</dt>
                  <dd>{selected.payment_method_label}</dd>
                </div>
                {selected.provider_reference ? (
                  <div>
                    <dt className="text-xs text-slate-500">Provider-Referenz</dt>
                    <dd className="font-mono text-xs">{selected.provider_reference}</dd>
                  </div>
                ) : null}
                {selected.order_id ? (
                  <div>
                    <dt className="text-xs text-slate-500">Bestellung</dt>
                    <dd className="font-mono text-xs">{selected.order_id.slice(0, 8)}…</dd>
                  </div>
                ) : null}
                {selected.application_id ? (
                  <div>
                    <dt className="text-xs text-slate-500">Mitgliedsantrag</dt>
                    <dd>
                      <a
                        href={`/admin/members/applications/${selected.application_id}`}
                        className="font-mono text-xs text-fc-blue hover:underline"
                      >
                        Antrag öffnen →
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">Admin-Notiz</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="rounded-lg border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Betrag (€) <span className="text-rose-600">*</span>
                </span>
                <input
                  type="text"
                  required
                  value={amountEur}
                  onChange={(e) => {
                    setAmountEur(sanitizeDecimalInput(e.target.value));
                    setError(null);
                  }}
                  placeholder="15,00"
                  className="h-9 rounded-lg border px-2 text-sm"
                  {...decimalInputProps()}
                />
                <span className="text-[11px] text-slate-500">
                  Tatsächlich eingegangener Betrag laut Kontoauszug. Bei 30 € (zwei Jahresbeiträge)
                  werden beide Jahre als bezahlt geführt.
                </span>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Zahlungseingang am <span className="text-rose-600">*</span>
                </span>
                <input
                  type="date"
                  required
                  value={receiptDate}
                  onChange={(e) => {
                    setReceiptDate(e.target.value);
                    setError(null);
                  }}
                  className="h-9 rounded-lg border px-2 text-sm"
                />
                <span className="text-[11px] text-slate-500">
                  Tatsächliches Datum des Geldeingangs auf dem Vereinskonto (Buchungsdatum).
                  {selected.membership_start_date
                    ? ` Beitritt laut Antrag: ${selected.membership_start_date.split("-").reverse().join(".")}.`
                    : ""}
                </span>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">Beleg / Referenz</span>
                <input
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  className="h-9 rounded-lg border px-2 text-sm"
                />
              </label>

              {receiptDate.trim() && receiptAffectsBalance === false ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Zahlungseingang ({receiptDate.split("-").reverse().join(".")}) liegt vor dem
                  Buchhaltungs-Start
                  {accountingStartDate
                    ? ` (${accountingStartDate.split("-").reverse().join(".")})`
                    : ""}
                  . Bestätigung markiert den Beitrag als bezahlt — der Kontostand ändert sich nicht
                  (Betrag steckt vermutlich schon im Anfangsbestand).
                </p>
              ) : receiptDate.trim() && receiptAffectsBalance === true && accountingStartDate ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Zahlungseingang ab Buchhaltungs-Start — bestätigter Betrag erhöht den Kontostand in
                  der Buchhaltung.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-2">
                {selected.payment_status !== "paid" && selected.payment_status !== "cancelled" ? (
                  <button
                    type="button"
                    disabled={pending || !receiptDate.trim() || !amountEur.trim()}
                    onClick={confirm}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Als bezahlt markieren
                  </button>
                ) : null}
                {selected.payment_status !== "paid" && selected.payment_status !== "cancelled" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={cancel}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700"
                  >
                    <X className="h-3.5 w-3.5" />
                    Stornieren
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  onClick={saveNote}
                  className="h-9 rounded-lg border px-3 text-xs font-semibold text-slate-700"
                >
                  Notiz speichern
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Zahlung in der Liste auswählen.</p>
          )}
        </div>
      </div>
    </div>
  );
}
