import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createPaymentWithAccounting } from "@/lib/payments/payment-service";

/** Offene Beitrags-Überweisung anlegen, falls noch keine existiert (manueller Antrag). */
export async function ensureOpenMembershipFeePayment(input: {
  userId: string;
  membershipId: string;
  amountCents: number;
  firstName: string;
  lastName: string;
}): Promise<{ created: boolean; paymentId?: string }> {
  const admin = createSupabaseAdminClient();
  const { data: existing, error: existingErr } = await admin
    .from("payments")
    .select("id")
    .eq("user_id", input.userId)
    .eq("payment_type", "membership_fee")
    .in("payment_status", ["open", "pending", "simulated"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingErr) throw new Error(existingErr.message);
  if (existing?.id) return { created: false, paymentId: existing.id };

  const name = `${input.firstName} ${input.lastName}`.trim();
  const result = await createPaymentWithAccounting({
    userId: input.userId,
    amountCents: input.amountCents,
    paymentType: "membership_fee",
    paymentMethod: "bank_transfer",
    membershipId: input.membershipId,
    description: `Mitgliedsbeitrag${name ? ` · ${name}` : ""}`,
  });

  return { created: true, paymentId: result.paymentId };
}
