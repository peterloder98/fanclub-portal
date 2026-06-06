"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatEur } from "@/lib/club/ledger";
import { logMemberActivity, MEMBER_ACTIVITY_TYPES } from "@/lib/membership/activity-log";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/payments/labels";
import { confirmPaymentManually } from "@/lib/payments/payment-service";
import type { PaymentMethod, PaymentStatus } from "@/lib/payments/types";
import { awardShopOrderStars, revokeShopOrderStars } from "@/lib/shop/order-stars";

function isPaymentSettled(status: PaymentStatus | null | undefined) {
  return status === "paid";
}

export type MerchandiseOrderRow = {
  id: string;
  status: string;
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_street: string;
  buyer_postal_code: string;
  buyer_city: string;
  total_cents: number;
  created_at: string;
  item_count: number;
  payment_id: string | null;
  payment_method_label: string | null;
  payment_status_label: string | null;
  payment_settled: boolean;
};

export type MerchandiseOrderDetail = MerchandiseOrderRow & {
  buyer_country: string;
  subtotal_cents: number | null;
  shipping_cents: number;
  shipped_at: string | null;
  cancelled_at: string | null;
  items: Array<{
    id: string;
    product_name: string;
    size_label: string | null;
    qty: number;
    unit_price_cents: number;
    line_total_cents: number;
  }>;
  events: Array<{
    id: string;
    event_type: string;
    title: string;
    details: string | null;
    created_at: string;
    created_by_name: string | null;
  }>;
  payment_id: string | null;
  payment_status: string | null;
  payment_method: PaymentMethod | null;
  payment_method_label: string | null;
  payment_status_label: string | null;
  payment_db_status: PaymentStatus | null;
  internal_reference: string | null;
};

async function loadPaymentMeta(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  paymentId: string | null,
) {
  if (!paymentId) {
    return {
      paymentMethod: null as PaymentMethod | null,
      paymentStatus: null as PaymentStatus | null,
      internalReference: null as string | null,
    };
  }
  const { data: payment } = await admin
    .from("payments")
    .select("payment_method,payment_status,internal_reference")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) {
    return {
      paymentMethod: null,
      paymentStatus: null,
      internalReference: null,
    };
  }
  return {
    paymentMethod: payment.payment_method as PaymentMethod,
    paymentStatus: payment.payment_status as PaymentStatus,
    internalReference: payment.internal_reference,
  };
}

export async function listMerchandiseOrdersAction(): Promise<MerchandiseOrderRow[]> {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("merchandise_orders")
    .select(
      "id,status,buyer_first_name,buyer_last_name,buyer_email,buyer_phone,buyer_street,buyer_postal_code,buyer_city,total_cents,created_at,payment_id,payment_status,merchandise_order_items(id)",
    )
    .order("created_at", { ascending: false });
  if (error) {
    if (/merchandise_orders|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  const paymentIds = [
    ...new Set(
      (data ?? [])
        .map((o) => (o as { payment_id?: string | null }).payment_id)
        .filter(Boolean) as string[],
    ),
  ];
  const paymentById = new Map<
    string,
    { method: PaymentMethod; status: PaymentStatus; reference: string }
  >();
  if (paymentIds.length) {
    const { data: payments } = await admin
      .from("payments")
      .select("id,payment_method,payment_status,internal_reference")
      .in("id", paymentIds);
    for (const p of payments ?? []) {
      paymentById.set(p.id, {
        method: p.payment_method as PaymentMethod,
        status: p.payment_status as PaymentStatus,
        reference: p.internal_reference,
      });
    }
  }

  return (data ?? []).map((o) => {
    const paymentId = (o as { payment_id?: string | null }).payment_id ?? null;
    const pay = paymentId ? paymentById.get(paymentId) : null;
    const paymentStatus = pay?.status ?? null;
    return {
      id: o.id,
      status: o.status,
      buyer_first_name: o.buyer_first_name,
      buyer_last_name: o.buyer_last_name,
      buyer_email: o.buyer_email,
      buyer_phone: o.buyer_phone,
      buyer_street: o.buyer_street,
      buyer_postal_code: o.buyer_postal_code,
      buyer_city: o.buyer_city,
      total_cents: o.total_cents,
      created_at: o.created_at,
      item_count: (o.merchandise_order_items as { id: string }[] | null)?.length ?? 0,
      payment_id: paymentId,
      payment_method_label: pay ? PAYMENT_METHOD_LABELS[pay.method] : null,
      payment_status_label: paymentStatus ? PAYMENT_STATUS_LABELS[paymentStatus] : null,
      payment_settled: isPaymentSettled(paymentStatus),
    };
  });
}

export async function getMerchandiseOrderAction(orderId: string): Promise<MerchandiseOrderDetail | null> {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data: order, error } = await admin
    .from("merchandise_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return null;

  const { data: items } = await admin
    .from("merchandise_order_items")
    .select("id,product_name,size_label,qty,unit_price_cents,line_total_cents,variant_id")
    .eq("order_id", orderId);

  const { data: events } = await admin
    .from("merchandise_order_events")
    .select("id,event_type,title,details,created_at,created_by")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const creatorIds = [...new Set((events ?? []).map((e) => e.created_by).filter(Boolean))] as string[];
  const { data: profiles } = creatorIds.length
    ? await admin.from("profiles").select("id,first_name,last_name").in("id", creatorIds)
    : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || null,
    ]),
  );

  const paymentId = (order as { payment_id?: string | null }).payment_id ?? null;
  const { paymentMethod, paymentStatus, internalReference } = await loadPaymentMeta(
    admin,
    paymentId,
  );

  return {
    id: order.id,
    status: order.status,
    buyer_first_name: order.buyer_first_name,
    buyer_last_name: order.buyer_last_name,
    buyer_email: order.buyer_email,
    buyer_phone: order.buyer_phone,
    buyer_street: order.buyer_street,
    buyer_postal_code: order.buyer_postal_code,
    buyer_city: order.buyer_city,
    buyer_country: order.buyer_country,
    subtotal_cents: (order as { subtotal_cents?: number | null }).subtotal_cents ?? null,
    shipping_cents: (order as { shipping_cents?: number }).shipping_cents ?? 0,
    total_cents: order.total_cents,
    created_at: order.created_at,
    shipped_at: order.shipped_at,
    cancelled_at: order.cancelled_at,
    item_count: items?.length ?? 0,
    items: items ?? [],
    events: (events ?? []).map((e) => ({
      id: e.id,
      event_type: e.event_type,
      title: e.title,
      details: e.details,
      created_at: e.created_at,
      created_by_name: e.created_by ? nameById.get(e.created_by) ?? null : null,
    })),
    payment_id: paymentId,
    payment_status: (order as { payment_status?: string | null }).payment_status ?? null,
    payment_method: paymentMethod,
    payment_method_label: paymentMethod ? PAYMENT_METHOD_LABELS[paymentMethod] : null,
    payment_status_label: paymentStatus ? PAYMENT_STATUS_LABELS[paymentStatus] : null,
    payment_db_status: paymentStatus,
    payment_settled: isPaymentSettled(paymentStatus),
    internal_reference: internalReference,
  };
}

export async function confirmOrderPaymentAction(input: { orderId: string; note?: string }) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();

  const { data: order, error } = await admin
    .from("merchandise_orders")
    .select("id,payment_id,status")
    .eq("id", input.orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw new Error("Bestellung nicht gefunden.");
  if (!order.payment_id) throw new Error("Keine Zahlung mit dieser Bestellung verknüpft.");

  const { paymentStatus, paymentMethod } = await loadPaymentMeta(admin, order.payment_id);
  if (isPaymentSettled(paymentStatus)) {
    throw new Error("Zahlung ist bereits als bezahlt verbucht.");
  }

  await confirmPaymentManually({
    paymentId: order.payment_id,
    adminUserId: user.id,
    note: input.note?.trim(),
  });

  const methodLabel = paymentMethod ? PAYMENT_METHOD_LABELS[paymentMethod] : "Zahlung";
  await admin.from("merchandise_order_events").insert({
    order_id: input.orderId,
    event_type: "payment_confirmed",
    title: "Zahlung verbucht",
    details: methodLabel,
    created_by: user.id,
  });

  revalidatePath("/admin/merchandise");
  revalidatePath(`/admin/merchandise/orders/${input.orderId}`);
  revalidatePath("/admin/payments");
  revalidatePath("/admin/accounting");
  return { ok: true };
}

const statusSchema = z.enum(["shipped", "cancelled"]);

export async function updateMerchandiseOrderStatusAction(input: {
  orderId: string;
  status: "shipped" | "cancelled";
}) {
  const { user } = await requireAdminAction();
  const parsed = statusSchema.parse(input.status);
  const admin = createSupabaseAdminClient();

  const { data: order, error: oErr } = await admin
    .from("merchandise_orders")
    .select("id,status,user_id,buyer_first_name,buyer_last_name,total_cents")
    .eq("id", input.orderId)
    .maybeSingle();
  if (oErr) throw new Error(oErr.message);
  if (!order) throw new Error("Bestellung nicht gefunden.");
  if (order.status !== "pending") throw new Error("Nur offene Bestellungen können geändert werden.");

  if (parsed === "shipped") {
    const { data: orderPay } = await admin
      .from("merchandise_orders")
      .select("payment_id")
      .eq("id", input.orderId)
      .maybeSingle();
    if (orderPay?.payment_id) {
      const { paymentStatus } = await loadPaymentMeta(admin, orderPay.payment_id);
      if (!isPaymentSettled(paymentStatus)) {
        throw new Error(
          "Versand erst nach Zahlungsbestätigung möglich. Bitte zuerst die Zahlung verbuchen.",
        );
      }
    }
  }

  const { data: items } = await admin
    .from("merchandise_order_items")
    .select("id,variant_id,qty,product_name")
    .eq("order_id", input.orderId);

  for (const item of items ?? []) {
    if (!item.variant_id) continue;
    const { data: v } = await admin
      .from("merchandise_variants")
      .select("qty_reserved,qty_sold")
      .eq("id", item.variant_id)
      .maybeSingle();
    if (!v) continue;
    const reserved = Math.max(0, (v.qty_reserved ?? 0) - item.qty);
    const sold = parsed === "shipped" ? (v.qty_sold ?? 0) + item.qty : v.qty_sold ?? 0;
    const { error: uErr } = await admin
      .from("merchandise_variants")
      .update({ qty_reserved: reserved, qty_sold: sold })
      .eq("id", item.variant_id);
    if (uErr) throw new Error(uErr.message);
  }

  const now = new Date().toISOString();
  const patch =
    parsed === "shipped"
      ? { status: "shipped", shipped_at: now, handled_by: user.id }
      : { status: "cancelled", cancelled_at: now, handled_by: user.id };

  const { error: upErr } = await admin
    .from("merchandise_orders")
    .update(patch)
    .eq("id", input.orderId);
  if (upErr) throw new Error(upErr.message);

  const title = parsed === "shipped" ? "Als versendet markiert" : "Storniert";
  const details = (items ?? [])
    .map((i) => `${i.qty}× ${i.product_name}`)
    .join(", ");

  await admin.from("merchandise_order_events").insert({
    order_id: input.orderId,
    event_type: parsed === "shipped" ? "order_shipped" : "order_cancelled",
    title,
    details,
    created_by: user.id,
  });

  await logMemberActivity({
    userId: order.user_id,
    eventType:
      parsed === "shipped"
        ? MEMBER_ACTIVITY_TYPES.merchandiseOrderShipped
        : MEMBER_ACTIVITY_TYPES.merchandiseOrderCancelled,
    title: parsed === "shipped" ? "Merchandise versendet" : "Bestellung storniert",
    details: `${formatEur(order.total_cents)} — ${details}`,
    linkUrl: `/admin/merchandise/orders/${input.orderId}`,
    linkLabel: "Bestellung",
    createdBy: user.id,
    metadata: { order_id: input.orderId },
  }).catch(() => {});

  if (parsed === "shipped") {
    // Stars bei Payment-Bestellungen erst nach Zahlungsbestätigung (payment-service)
    const { data: orderPay } = await admin
      .from("merchandise_orders")
      .select("payment_id")
      .eq("id", input.orderId)
      .maybeSingle();
    if (!orderPay?.payment_id) {
      await awardShopOrderStars(input.orderId).catch(() => {});
    }
  } else {
    await revokeShopOrderStars(input.orderId).catch(() => {});
  }

  revalidatePath("/admin/merchandise");
  revalidatePath(`/admin/merchandise/orders/${input.orderId}`);
  revalidatePath("/merchandise");
  return { ok: true };
}
