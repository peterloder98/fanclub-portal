"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  cancelPaymentManually,
  confirmPaymentManually,
  updatePaymentAdminFields,
} from "@/lib/payments/payment-service";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
} from "@/lib/payments/labels";
import type { PaymentMethod, PaymentStatus } from "@/lib/payments/types";

export type AdminPaymentRow = {
  id: string;
  user_id: string;
  member_name: string;
  order_id: string | null;
  membership_id: string | null;
  application_id: string | null;
  amount_cents: number;
  payment_type: string;
  payment_type_label: string;
  payment_method: string;
  payment_method_label: string;
  payment_status: PaymentStatus;
  payment_status_label: string;
  internal_reference: string;
  provider_reference: string | null;
  admin_note: string | null;
  receipt_reference: string | null;
  created_at: string;
  paid_at: string | null;
};

export async function listAdminPaymentsAction(filter?: {
  status?: PaymentStatus | "all";
}): Promise<AdminPaymentRow[]> {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();

  let q = admin
    .from("payments")
    .select(
      "id,user_id,order_id,membership_id,application_id,amount_cents,payment_type,payment_method,payment_status,internal_reference,provider_reference,admin_note,receipt_reference,created_at,paid_at",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  const status = filter?.status ?? "all";
  if (status !== "all") q = q.eq("payment_status", status);

  const { data, error } = await q;
  if (error) {
    if (/payments|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  const userIds = [...new Set((data ?? []).map((p) => p.user_id))];
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id,first_name,last_name").in("id", userIds)
    : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—",
    ]),
  );

  return (data ?? []).map((p) => ({
    id: p.id,
    user_id: p.user_id,
    member_name: nameById.get(p.user_id) ?? "—",
    order_id: p.order_id,
    membership_id: p.membership_id,
    application_id: (p as { application_id?: string | null }).application_id ?? null,
    amount_cents: p.amount_cents,
    payment_type: p.payment_type,
    payment_type_label: PAYMENT_TYPE_LABELS[p.payment_type as keyof typeof PAYMENT_TYPE_LABELS] ?? p.payment_type,
    payment_method: p.payment_method,
    payment_method_label:
      PAYMENT_METHOD_LABELS[p.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ?? p.payment_method,
    payment_status: p.payment_status as PaymentStatus,
    payment_status_label:
      PAYMENT_STATUS_LABELS[p.payment_status as keyof typeof PAYMENT_STATUS_LABELS] ?? p.payment_status,
    internal_reference: p.internal_reference,
    provider_reference: p.provider_reference,
    admin_note: p.admin_note,
    receipt_reference: p.receipt_reference,
    created_at: p.created_at,
    paid_at: p.paid_at,
  }));
}

const methodSchema = z.enum([
  "bank_transfer",
  "paypal",
  "stripe",
  "apple_pay",
  "amazon_pay",
]);

export async function confirmPaymentAction(input: {
  paymentId: string;
  note?: string;
  receiptReference?: string;
}) {
  const { user } = await requireAdminAction();
  await confirmPaymentManually({
    paymentId: input.paymentId,
    adminUserId: user.id,
    note: input.note,
    receiptReference: input.receiptReference,
  });
  revalidatePath("/admin/payments");
  revalidatePath("/admin/accounting");
  revalidatePath("/admin/merchandise");
  revalidatePath("/profile");
  return { ok: true };
}

export async function cancelPaymentAction(input: { paymentId: string; note?: string }) {
  const { user } = await requireAdminAction();
  await cancelPaymentManually({
    paymentId: input.paymentId,
    adminUserId: user.id,
    note: input.note,
  });
  revalidatePath("/admin/payments");
  revalidatePath("/admin/accounting");
  return { ok: true };
}

export async function updatePaymentFieldsAction(input: {
  paymentId: string;
  note?: string;
  receiptReference?: string;
  paymentMethod?: PaymentMethod;
}) {
  const { user } = await requireAdminAction();
  if (input.paymentMethod) methodSchema.parse(input.paymentMethod);
  await updatePaymentAdminFields({
    paymentId: input.paymentId,
    adminUserId: user.id,
    note: input.note,
    receiptReference: input.receiptReference,
    paymentMethod: input.paymentMethod,
  });
  revalidatePath("/admin/payments");
  return { ok: true };
}
