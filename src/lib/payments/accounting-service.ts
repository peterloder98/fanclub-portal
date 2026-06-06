import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookkeepingStatus, PaymentType } from "@/lib/payments/types";
import type { LedgerCategory } from "@/lib/club/ledger";

function ledgerCategoryForPaymentType(paymentType: PaymentType): LedgerCategory {
  if (paymentType === "shop_order") return "merchandise";
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

  const { data, error } = await admin
    .from("club_ledger_entries")
    .insert({
      entry_type: "income",
      amount_cents: amountCents,
      description: `${description} · ${internalReference}`,
      category: ledgerCategoryForPaymentType(paymentType),
      member_id: userId,
      entry_date: new Date().toISOString().slice(0, 10),
      payment_id: paymentId,
      order_id: orderId ?? null,
      bookkeeping_status: "open" satisfies BookkeepingStatus,
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
}) {
  const { admin, paymentId, confirmedBy } = input;
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await admin
    .from("club_ledger_entries")
    .update({
      bookkeeping_status: "paid" satisfies BookkeepingStatus,
      entry_date: today,
      created_by: confirmedBy,
    })
    .eq("payment_id", paymentId)
    .eq("bookkeeping_status", "open");

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
