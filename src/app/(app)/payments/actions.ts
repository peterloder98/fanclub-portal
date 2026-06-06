"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPaymentWithAccounting } from "@/lib/payments/payment-service";
import { listEnabledPaymentMethods } from "@/lib/payments/config";
import type { PaymentMethod } from "@/lib/payments/types";

const methodSchema = z.enum([
  "bank_transfer",
  "paypal",
  "stripe",
  "apple_pay",
  "amazon_pay",
]);

export async function listPaymentMethodsAction() {
  const methods = await listEnabledPaymentMethods();
  return methods.map((m) => ({
    provider: m.provider,
    is_enabled: m.is_enabled,
    is_test_mode: m.is_test_mode,
  }));
}

export async function initiateMembershipPaymentAction(input: {
  paymentMethod: PaymentMethod;
  amountCents?: number;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Bitte einloggen.");

  const method = methodSchema.parse(input.paymentMethod);

  const { data: membership } = await supabase
    .from("memberships")
    .select("id,fee_cents,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) throw new Error("Keine aktive Mitgliedschaft gefunden.");

  const amountCents = input.amountCents ?? membership.fee_cents ?? 1500;

  const result = await createPaymentWithAccounting({
    userId: user.id,
    amountCents,
    paymentType: "membership_fee",
    paymentMethod: method,
    membershipId: membership.id,
    description: "Mitgliedsbeitrag",
  });

  revalidatePath("/profile");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/accounting");

  return result;
}
