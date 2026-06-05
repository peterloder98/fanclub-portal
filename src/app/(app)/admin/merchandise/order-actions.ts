"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatEur } from "@/lib/club/ledger";
import { logMemberActivity, MEMBER_ACTIVITY_TYPES } from "@/lib/membership/activity-log";

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
};

export type MerchandiseOrderDetail = MerchandiseOrderRow & {
  buyer_country: string;
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
};

export async function listMerchandiseOrdersAction(): Promise<MerchandiseOrderRow[]> {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("merchandise_orders")
    .select("id,status,buyer_first_name,buyer_last_name,buyer_email,buyer_phone,buyer_street,buyer_postal_code,buyer_city,total_cents,created_at,merchandise_order_items(id)")
    .order("created_at", { ascending: false });
  if (error) {
    if (/merchandise_orders|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((o) => ({
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
  }));
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
  };
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

  revalidatePath("/admin/merchandise");
  revalidatePath(`/admin/merchandise/orders/${input.orderId}`);
  revalidatePath("/merchandise");
  return { ok: true };
}
