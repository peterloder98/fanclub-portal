import { getAppSetting, setAppSetting } from "@/lib/settings/app-settings";
import type { ClubLedgerRow } from "@/lib/club/ledger";
import { sumLedgerRows } from "@/lib/club/ledger";

export const ACCOUNTING_START_DATE_KEY = "accounting_start_date";
export const ACCOUNTING_OPENING_BALANCE_CENTS_KEY = "accounting_opening_balance_cents";

export type AccountingSettings = {
  startDate: string | null;
  openingBalanceCents: number;
};

export async function getAccountingSettings(): Promise<AccountingSettings> {
  const [startRaw, balanceRaw] = await Promise.all([
    getAppSetting(ACCOUNTING_START_DATE_KEY),
    getAppSetting(ACCOUNTING_OPENING_BALANCE_CENTS_KEY),
  ]);
  const openingBalanceCents = balanceRaw?.trim()
    ? Math.round(Number(balanceRaw.replace(",", ".")))
    : 0;
  return {
    startDate: startRaw?.trim() || null,
    openingBalanceCents: Number.isFinite(openingBalanceCents) ? openingBalanceCents : 0,
  };
}

export async function saveAccountingSettings(input: {
  startDate: string;
  openingBalanceEur: number;
}) {
  const cents = Math.round(input.openingBalanceEur * 100);
  if (!input.startDate.trim()) throw new Error("Startdatum fehlt.");
  if (!Number.isFinite(cents)) throw new Error("Ungültiger Kontostand.");
  await setAppSetting(ACCOUNTING_START_DATE_KEY, input.startDate.trim());
  await setAppSetting(ACCOUNTING_OPENING_BALANCE_CENTS_KEY, String(cents));
}

/** Neue Buchungen gehören in die Kasse — inkl. Mitgliedsbeiträge. */
export function includeInAccountingForCategory(_category: ClubLedgerRow["category"]) {
  return true;
}

function isPostedToBank(row: Pick<ClubLedgerRow, "bookkeeping_status">) {
  return row.bookkeeping_status !== "open" && row.bookkeeping_status !== "cancelled";
}

export function isAccountingRelevantRow(
  row: Pick<
    ClubLedgerRow,
    "include_in_accounting" | "entry_date" | "category" | "bookkeeping_status"
  >,
  settings: AccountingSettings,
): boolean {
  if (row.bookkeeping_status === "cancelled") return false;
  if (settings.startDate && row.entry_date < settings.startDate) return false;
  // Altes Flag: Beiträge waren ausgeblendet — ab Startdatum zählen sie trotzdem.
  if (row.include_in_accounting === false && row.category !== "membership") return false;
  return true;
}

export function isAccountingBalanceRow(
  row: Pick<
    ClubLedgerRow,
    "include_in_accounting" | "entry_date" | "category" | "bookkeeping_status"
  >,
  settings: AccountingSettings,
): boolean {
  return isAccountingRelevantRow(row, settings) && isPostedToBank(row);
}

export function filterAccountingRows(
  rows: ClubLedgerRow[],
  settings: AccountingSettings,
): ClubLedgerRow[] {
  return rows.filter((r) => isAccountingRelevantRow(r, settings));
}

export function filterAccountingBalanceRows(
  rows: ClubLedgerRow[],
  settings: AccountingSettings,
): ClubLedgerRow[] {
  return rows.filter((r) => isAccountingBalanceRow(r, settings));
}

export function computeAccountingBalance(
  rows: ClubLedgerRow[],
  settings: AccountingSettings,
) {
  const relevant = filterAccountingBalanceRows(rows, settings);
  const { incomeCents, expenseCents } = sumLedgerRows(relevant);
  return {
    incomeCents,
    expenseCents,
    balanceCents: settings.openingBalanceCents + incomeCents - expenseCents,
  };
}
