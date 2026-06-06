import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncMemberContributionDate } from "@/lib/club/contribution-sync";
import { awardShopOrderStars } from "@/lib/shop/order-stars";
import { createOpenAccountingEntry, confirmAccountingEntry, cancelAccountingEntry } from "@/lib/payments/accounting-service";
import { prepareBankTransferCheckout } from "@/lib/payments/bank-transfer-service";
import { prepareWalletCheckout } from "@/lib/payments/wallet-service";
import { nextInternalReference } from "@/lib/payments/reference";
import { listEnabledPaymentMethods } from "@/lib/payments/config";
import type {
  PaymentCheckoutResult,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from "@/lib/payments/types";

async function logPaymentAudit(
  admin: SupabaseClient,
  input: {
    paymentId: string;
    action: string;
    oldStatus?: string | null;
    newStatus?: string | null;
    note?: string | null;
    changedBy?: string | null;
  },
) {
  await admin.from("payment_audit_log").insert({
    payment_id: input.paymentId,
    action: input.action,
    old_status: input.oldStatus ?? null,
    new_status: input.newStatus ?? null,
    note: input.note ?? null,
    changed_by: input.changedBy ?? null,
  });
}

function initialStatusForMethod(method: PaymentMethod): PaymentStatus {
  if (method === "bank_transfer") return "open";
  return "simulated";
}

export async function createPaymentWithAccounting(input: {
  userId: string;
  amountCents: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  orderId?: string | null;
  membershipId?: string | null;
  applicationId?: string | null;
  description: string;
}): Promise<PaymentCheckoutResult> {
  const admin = createSupabaseAdminClient();
  const methods = await listEnabledPaymentMethods();
  const enabled = methods.find((m) => m.provider === input.paymentMethod);
  if (!enabled?.is_enabled) {
    throw new Error("Diese Zahlungsart ist derzeit nicht verfügbar.");
  }

  const internalReference = await nextInternalReference(admin, input.paymentType);
  const paymentStatus = initialStatusForMethod(input.paymentMethod);

  const { data: payment, error: pErr } = await admin
    .from("payments")
    .insert({
      user_id: input.userId,
      order_id: input.orderId ?? null,
      membership_id: input.membershipId ?? null,
      application_id: input.applicationId ?? null,
      amount_cents: input.amountCents,
      currency: "EUR",
      payment_type: input.paymentType,
      payment_method: input.paymentMethod,
      payment_status: paymentStatus,
      internal_reference: internalReference,
    })
    .select("id")
    .single();
  if (pErr) throw new Error(pErr.message);

  const paymentId = payment.id as string;

  await createOpenAccountingEntry({
    admin,
    paymentId,
    userId: input.userId,
    orderId: input.orderId,
    paymentType: input.paymentType,
    amountCents: input.amountCents,
    description: input.description,
    internalReference,
  });

  if (input.orderId) {
    await admin
      .from("merchandise_orders")
      .update({ payment_id: paymentId, payment_status: "unpaid" })
      .eq("id", input.orderId);
  }

  let providerExtras: Partial<PaymentCheckoutResult> = {};
  if (input.paymentMethod === "bank_transfer") {
    providerExtras = await prepareBankTransferCheckout({
      paymentId,
      internalReference,
      amountCents: input.amountCents,
      orderId: input.orderId ?? undefined,
    });
  } else if (
    input.paymentMethod === "paypal" ||
    input.paymentMethod === "stripe" ||
    input.paymentMethod === "apple_pay" ||
    input.paymentMethod === "amazon_pay"
  ) {
    const sim = await prepareWalletCheckout({
      provider: input.paymentMethod,
      paymentId,
      internalReference,
      amountCents: input.amountCents,
    });
    providerExtras = sim;
    await admin
      .from("payments")
      .update({ provider_reference: sim.simulatedProviderReference })
      .eq("id", paymentId);
  }

  return {
    paymentId,
    orderId: input.orderId ?? undefined,
    applicationId: input.applicationId ?? undefined,
    internalReference,
    amountCents: input.amountCents,
    paymentMethod: input.paymentMethod,
    paymentStatus,
    ...providerExtras,
  };
}

export async function confirmPaymentManually(input: {
  paymentId: string;
  adminUserId: string;
  note?: string;
  receiptReference?: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .select("*")
    .eq("id", input.paymentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) throw new Error("Zahlung nicht gefunden.");
  if (payment.payment_status === "paid") throw new Error("Zahlung ist bereits als bezahlt markiert.");
  if (payment.payment_status === "cancelled") throw new Error("Stornierte Zahlung kann nicht bestätigt werden.");

  const now = new Date().toISOString();
  const { error: upErr } = await admin
    .from("payments")
    .update({
      payment_status: "paid",
      paid_at: now,
      manually_confirmed_by: input.adminUserId,
      manually_confirmed_at: now,
      admin_note: input.note?.trim() || payment.admin_note,
      receipt_reference: input.receiptReference?.trim() || payment.receipt_reference,
    })
    .eq("id", input.paymentId);
  if (upErr) throw new Error(upErr.message);

  await confirmAccountingEntry({
    admin,
    paymentId: input.paymentId,
    confirmedBy: input.adminUserId,
  });

  if (payment.order_id) {
    await admin
      .from("merchandise_orders")
      .update({ payment_status: "paid" })
      .eq("id", payment.order_id);
    await awardShopOrderStars(payment.order_id).catch(() => {});
  }

  if (payment.payment_type === "membership_fee") {
    await syncMemberContributionDate(admin, payment.user_id);
  }

  await logPaymentAudit(admin, {
    paymentId: input.paymentId,
    action: "manual_confirm",
    oldStatus: payment.payment_status,
    newStatus: "paid",
    note: input.note,
    changedBy: input.adminUserId,
  });

  return { ok: true };
}

export async function cancelPaymentManually(input: {
  paymentId: string;
  adminUserId: string;
  note?: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data: payment, error } = await admin
    .from("payments")
    .select("*")
    .eq("id", input.paymentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) throw new Error("Zahlung nicht gefunden.");
  if (payment.payment_status === "paid") throw new Error("Bezahlte Zahlung kann nicht storniert werden.");

  const { error: upErr } = await admin
    .from("payments")
    .update({
      payment_status: "cancelled",
      admin_note: input.note?.trim() || payment.admin_note,
    })
    .eq("id", input.paymentId);
  if (upErr) throw new Error(upErr.message);

  await cancelAccountingEntry({ admin, paymentId: input.paymentId });

  if (payment.order_id) {
    await admin
      .from("merchandise_orders")
      .update({ payment_status: "cancelled" })
      .eq("id", payment.order_id);
  }

  await logPaymentAudit(admin, {
    paymentId: input.paymentId,
    action: "cancel",
    oldStatus: payment.payment_status,
    newStatus: "cancelled",
    note: input.note,
    changedBy: input.adminUserId,
  });

  return { ok: true };
}

export async function updatePaymentAdminFields(input: {
  paymentId: string;
  adminUserId: string;
  note?: string;
  receiptReference?: string;
  paymentMethod?: PaymentMethod;
}) {
  const admin = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {};
  if (input.note !== undefined) patch.admin_note = input.note.trim() || null;
  if (input.receiptReference !== undefined) patch.receipt_reference = input.receiptReference.trim() || null;
  if (input.paymentMethod) patch.payment_method = input.paymentMethod;

  const { data: before } = await admin
    .from("payments")
    .select("payment_method,admin_note,receipt_reference")
    .eq("id", input.paymentId)
    .maybeSingle();

  const { error } = await admin.from("payments").update(patch).eq("id", input.paymentId);
  if (error) throw new Error(error.message);

  await logPaymentAudit(admin, {
    paymentId: input.paymentId,
    action: "admin_update",
    note: JSON.stringify({ before, after: patch }),
    changedBy: input.adminUserId,
  });

  return { ok: true };
}
