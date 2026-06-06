import {
  filterLedgerByPeriod,
  formatEur,
  formatLedgerEntryNumber,
  isConfirmedLedgerIncome,
  LEDGER_CATEGORY_LABELS,
  sumLedgerRows,
  type ClubLedgerRow,
  type LedgerPeriodMode,
} from "@/lib/club/ledger";
import { BOOKKEEPING_STATUS_LABELS } from "@/lib/payments/labels";

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function formatDE(date: string) {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${d}.${m}.${y}`;
}

function bookkeepingLabel(r: ClubLedgerRow) {
  if (!r.payment_id) return "manuell";
  return BOOKKEEPING_STATUS_LABELS[r.bookkeeping_status ?? "paid"] ?? r.bookkeeping_status ?? "";
}

export function buildLedgerCsv(rows: ClubLedgerRow[], opts?: { openOnly?: boolean; paidOnly?: boolean }) {
  let filtered = rows;
  if (opts?.openOnly) {
    filtered = rows.filter((r) => r.bookkeeping_status === "open");
  } else if (opts?.paidOnly) {
    filtered = rows.filter((r) => isConfirmedLedgerIncome(r) || r.entry_type === "expense");
  }

  const header = [
    "Vorgangsnummer",
    "Datum",
    "Art",
    "Betrag_EUR",
    "Kategorie",
    "Buchungsstatus",
    "Beschreibung",
    "Mitglied",
    "Beleg",
    "Angelegt_von",
  ].join(";");

  const lines = filtered.map((r) =>
    [
      formatLedgerEntryNumber(r.entry_number),
      formatDE(r.entry_date),
      r.entry_type === "income" ? "Einnahme" : "Ausgabe",
      (r.amount_cents / 100).toFixed(2).replace(".", ","),
      LEDGER_CATEGORY_LABELS[r.category],
      bookkeepingLabel(r),
      r.description,
      r.member_name ?? "",
      r.receipt_storage_path ? "ja" : "nein",
      r.created_by_name ?? "",
    ]
      .map((c) => csvEscape(String(c)))
      .join(";"),
  );

  return `\uFEFF${header}\n${lines.join("\n")}`;
}

export type LedgerPeriodSummary = {
  label: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  entryCount: number;
};

export function summarizeLedgerByMonth(
  rows: ClubLedgerRow[],
  year: number,
): LedgerPeriodSummary[] {
  const months = new Map<string, ClubLedgerRow[]>();
  for (const r of rows) {
    const [y, m] = r.entry_date.split("-");
    if (Number(y) !== year) continue;
    const key = `${y}-${m}`;
    if (!months.has(key)) months.set(key, []);
    months.get(key)!.push(r);
  }

  return Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => {
      const { incomeCents, expenseCents } = sumLedgerRows(list);
      const [, m] = key.split("-");
      const monthLabel = new Date(year, Number(m) - 1, 1).toLocaleDateString("de-DE", {
        month: "long",
      });
      return {
        label: `${monthLabel} ${year}`,
        incomeCents,
        expenseCents,
        balanceCents: incomeCents - expenseCents,
        entryCount: list.length,
      };
    });
}

export function summarizeFilteredLedger(
  rows: ClubLedgerRow[],
  mode: LedgerPeriodMode,
  year: number,
  month: number,
) {
  const filtered = filterLedgerByPeriod(rows, mode, year, month);
  const { incomeCents, expenseCents } = sumLedgerRows(filtered);
  return {
    rows: filtered,
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    incomeLabel: formatEur(incomeCents),
    expenseLabel: formatEur(expenseCents),
    balanceLabel: formatEur(incomeCents - expenseCents),
  };
}
