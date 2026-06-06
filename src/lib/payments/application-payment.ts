import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyMembershipDownloadToken } from "@/lib/membership/download-token";
import { createPaymentWithAccounting } from "@/lib/payments/payment-service";
import type { PaymentCheckoutResult, PaymentMethod } from "@/lib/payments/types";

export async function createApplicationMembershipPayment(input: {
  applicationId: string;
  token: string;
  paymentMethod: PaymentMethod;
}): Promise<PaymentCheckoutResult> {
  if (!verifyMembershipDownloadToken(input.applicationId, input.token)) {
    throw new Error("Ungültiger oder abgelaufener Zahlungslink. Bitte Antrag erneut öffnen.");
  }

  const admin = createSupabaseAdminClient();
  const { data: app, error: appErr } = await admin
    .from("membership_applications")
    .select("id,user_id,status,fee_cents,first_name,last_name")
    .eq("id", input.applicationId)
    .maybeSingle();

  if (appErr) throw new Error(appErr.message);
  if (!app?.user_id) throw new Error("Antrag nicht gefunden.");
  if (app.status === "approved" || app.status === "rejected") {
    throw new Error("Für diesen Antrag ist keine Zahlung mehr möglich.");
  }

  const { data: existing } = await admin
    .from("payments")
    .select("id,payment_status,internal_reference,payment_method,amount_cents")
    .eq("application_id", input.applicationId)
    .in("payment_status", ["open", "pending", "simulated"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    throw new Error(
      `Es existiert bereits eine offene Zahlung (${existing.internal_reference}). Bitte diese abschließen oder den Vorstand kontaktieren.`,
    );
  }

  const { data: membership } = await admin
    .from("memberships")
    .select("id,status,fee_cents")
    .eq("user_id", app.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.id) throw new Error("Mitgliedschaft nicht gefunden.");
  if (membership.status === "active") {
    throw new Error("Mitgliedschaft ist bereits aktiv — keine Zahlung nötig.");
  }

  const amountCents = app.fee_cents ?? membership.fee_cents ?? 1500;
  const name = `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim();

  const result = await createPaymentWithAccounting({
    userId: app.user_id,
    amountCents,
    paymentType: "membership_fee",
    paymentMethod: input.paymentMethod,
    membershipId: membership.id,
    applicationId: app.id,
    description: `Mitgliedsbeitrag Antrag${name ? ` · ${name}` : ""}`,
  });

  return result;
}
