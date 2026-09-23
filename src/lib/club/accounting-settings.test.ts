import { describe, expect, it } from "vitest";
import {
  filterAccountingBalanceRows,
  filterAccountingRows,
  isAccountingRelevantRow,
  type AccountingSettings,
} from "@/lib/club/accounting-settings";
import type { ClubLedgerRow } from "@/lib/club/ledger";

const settings: AccountingSettings = {
  startDate: "2026-01-01",
  openingBalanceCents: 0,
};

function row(partial: Partial<ClubLedgerRow>): ClubLedgerRow {
  return {
    id: "1",
    entry_number: "2026-0001",
    entry_type: "income",
    amount_cents: 1500,
    description: "Mitgliedsbeitrag Antrag · Test",
    category: "membership",
    member_id: "u1",
    member_name: "Test",
    entry_date: "2026-09-22",
    created_at: "2026-09-22T12:00:00Z",
    created_by_name: null,
    receipt_storage_path: null,
    activity_log_id: null,
    payment_id: "pay-1",
    bookkeeping_status: "open",
    include_in_accounting: true,
    ...partial,
  };
}

describe("accounting Zahlungsliste filter", () => {
  it("excludes open application fee rows from Zahlungsliste", () => {
    const open = row({ bookkeeping_status: "open" });
    expect(isAccountingRelevantRow(open, settings)).toBe(false);
    expect(filterAccountingRows([open], settings)).toHaveLength(0);
  });

  it("includes paid membership fees in Zahlungsliste and balance", () => {
    const paid = row({ bookkeeping_status: "paid", created_by_name: "Andreas Seidel" });
    expect(isAccountingRelevantRow(paid, settings)).toBe(true);
    expect(filterAccountingRows([paid], settings)).toHaveLength(1);
    expect(filterAccountingBalanceRows([paid], settings)).toHaveLength(1);
  });

  it("does not count open fees toward Kontostand", () => {
    const open = row({ bookkeeping_status: "open" });
    expect(filterAccountingBalanceRows([open], settings)).toHaveLength(0);
  });
});
