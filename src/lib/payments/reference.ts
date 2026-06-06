import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentType } from "@/lib/payments/types";

const PREFIX: Record<PaymentType, string> = {
  shop_order: "BESTELLUNG",
  membership_fee: "MITGLIED",
  other: "ZAHLUNG",
};

export async function nextInternalReference(
  admin: SupabaseClient,
  paymentType: PaymentType,
): Promise<string> {
  const year = new Date().getFullYear();
  const col = paymentType === "membership_fee" ? "membership_seq" : "shop_seq";

  const { data: row, error: selErr } = await admin
    .from("payment_reference_counters")
    .select("year,shop_seq,membership_seq")
    .eq("year", year)
    .maybeSingle();

  if (selErr && !/payment_reference_counters|does not exist/i.test(selErr.message)) {
    throw new Error(selErr.message);
  }

  let seq = 1;
  if (!row) {
    const { error: insErr } = await admin.from("payment_reference_counters").insert({
      year,
      shop_seq: paymentType === "shop_order" ? 1 : 0,
      membership_seq: paymentType === "membership_fee" ? 1 : 0,
    });
    if (insErr) throw new Error(insErr.message);
  } else {
    seq = (paymentType === "membership_fee" ? row.membership_seq : row.shop_seq) + 1;
    const { error: upErr } = await admin
      .from("payment_reference_counters")
      .update({ [col]: seq })
      .eq("year", year);
    if (upErr) throw new Error(upErr.message);
  }

  const prefix = PREFIX[paymentType];
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}
