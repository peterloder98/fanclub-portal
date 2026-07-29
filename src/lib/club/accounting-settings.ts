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

export function includeInAccountingForCategory(category: ClubLedgerRow["category"]) {
  return category !== "membership";
}

export function isAccountingRelevantRow(
  row: Pick<ClubLedgerRow, "include_in_accounting" | "entry_date">,
  settings: AccountingSettings,
): boolean {
  if (row.include_in_accounting === false) return false;
  if (settings.startDate && row.entry_date < settings.startDate) return false;
  return true;
}

export function filterAccountingRows(
  rows: ClubLedgerRow[],
  settings: AccountingSettings,
): ClubLedgerRow[] {
  return rows.filter((r) => isAccountingRelevantRow(r, settings));
}

export function computeAccountingBalance(
  rows: ClubLedgerRow[],
  settings: AccountingSettings,
) {
  const relevant = filterAccountingRows(rows, settings);
  const { incomeCents, expenseCents } = sumLedgerRows(relevant);
  return {
    incomeCents,
    expenseCents,
    balanceCents: settings.openingBalanceCents + incomeCents - expenseCents,
  };
}
