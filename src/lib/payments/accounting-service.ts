import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookkeepingStatus, PaymentType } from "@/lib/payments/types";
import type { LedgerCategory } from "@/lib/club/ledger";
import { includeInAccountingForCategory } from "@/lib/club/accounting-settings";

function ledgerCategoryForPaymentType(paymentType: PaymentType): LedgerCategory {
  if (paymentType === "membership_fee") return "membership";
  return "general";
}

export async function createOpenAccountingEntry(input: {
  admin: SupabaseClient;
  paymentId: string;
  userId: string;
  orderId?: string | null;
  paymentType: PaymentType;
  amountCents: number;
  description: string;
  internalReference: string;
}) {
  const { admin, paymentId, userId, orderId, paymentType, amountCents, description, internalReference } =
    input;

  const category = ledgerCategoryForPaymentType(paymentType);

  const { data, error } = await admin
    .from("club_ledger_entries")
    .insert({
      entry_type: "income",
      amount_cents: amountCents,
      description: `${description} · ${internalReference}`,
      category,
      member_id: userId,
      entry_date: new Date().toISOString().slice(0, 10),
      payment_id: paymentId,
      order_id: orderId ?? null,
      bookkeeping_status: "open" satisfies BookkeepingStatus,
      include_in_accounting: includeInAccountingForCategory(category),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function confirmAccountingEntry(input: {
  admin: SupabaseClient;
  paymentId: string;
  confirmedBy: string;
  entryDate: string;
  amountCents?: number;
}) {
  const { admin, paymentId, confirmedBy, entryDate, amountCents } = input;
  const patch: {
    bookkeeping_status: BookkeepingStatus;
    entry_date: string;
    created_by: string;
    include_in_accounting: boolean;
    amount_cents?: number;
  } = {
    bookkeeping_status: "paid",
    entry_date: entryDate,
    created_by: confirmedBy,
    include_in_accounting: true,
  };
  if (typeof amountCents === "number" && amountCents > 0) {
    patch.amount_cents = amountCents;
  }
  const { error } = await admin
    .from("club_ledger_entries")
    .update(patch)
    .eq("payment_id", paymentId)
    .or("bookkeeping_status.is.null,bookkeeping_status.eq.open,bookkeeping_status.eq.paid");

  if (error) throw new Error(error.message);
}

export async function cancelAccountingEntry(input: {
  admin: SupabaseClient;
  paymentId: string;
}) {
  const { admin, paymentId } = input;
  const { error } = await admin
    .from("club_ledger_entries")
    .update({ bookkeeping_status: "cancelled" satisfies BookkeepingStatus })
    .eq("payment_id", paymentId)
    .in("bookkeeping_status", ["open", "paid"]);

  if (error) throw new Error(error.message);
}
