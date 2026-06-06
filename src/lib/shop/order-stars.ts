import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** +1 Anni-Star je 10 € Bestellwert (abgeschlossen / versendet). */
export function starsForOrderTotalCents(totalCents: number): number {
  if (totalCents < 1000) return 0;
  return Math.floor(totalCents / 1000);
}

export async function awardShopOrderStars(orderId: string): Promise<{ awarded: boolean; stars: number }> {
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("merchandise_order_star_awards")
    .select("order_id,revoked_at")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing && !existing.revoked_at) {
    return { awarded: false, stars: 0 };
  }

  const { data: order } = await admin
    .from("merchandise_orders")
    .select("id,user_id,status,total_cents,payment_id,payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { awarded: false, stars: 0 };

  const hasPaymentSystem = Boolean((order as { payment_id?: string | null }).payment_id);
  const paymentPaid = (order as { payment_status?: string }).payment_status === "paid";

  // Neue Bestellungen: Stars erst nach manueller Zahlungsbestätigung
  if (hasPaymentSystem) {
    if (!paymentPaid) return { awarded: false, stars: 0 };
  } else if (order.status !== "shipped") {
    // Legacy-Bestellungen ohne Payment: weiterhin bei Versand
    return { awarded: false, stars: 0 };
  }

  const stars = starsForOrderTotalCents(order.total_cents);
  if (stars <= 0) return { awarded: false, stars: 0 };

  const { data: pt, error: ptErr } = await admin
    .from("points_transactions")
    .insert({
      user_id: order.user_id,
      points: stars,
      reason: "shop_order",
      entity_type: "merchandise_order",
      entity_id: order.id,
    })
    .select("id")
    .maybeSingle();

  if (ptErr) {
    if (/duplicate|unique/i.test(ptErr.message)) return { awarded: false, stars: 0 };
    throw new Error(ptErr.message);
  }

  await admin.from("merchandise_order_star_awards").upsert({
    order_id: order.id,
    user_id: order.user_id,
    stars_awarded: stars,
    order_total_cents: order.total_cents,
    awarded_at: new Date().toISOString(),
    revoked_at: null,
    points_transaction_id: pt?.id ?? null,
  });

  return { awarded: true, stars };
}

export async function revokeShopOrderStars(orderId: string): Promise<{ revoked: boolean; stars: number }> {
  const admin = createSupabaseAdminClient();

  const { data: award } = await admin
    .from("merchandise_order_star_awards")
    .select("order_id,user_id,stars_awarded,revoked_at,points_transaction_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!award || award.revoked_at) return { revoked: false, stars: 0 };

  await admin.from("points_transactions").insert({
    user_id: award.user_id,
    points: -award.stars_awarded,
    reason: "shop_order_revoked",
    entity_type: "merchandise_order",
    entity_id: orderId,
  });

  await admin
    .from("merchandise_order_star_awards")
    .update({ revoked_at: new Date().toISOString() })
    .eq("order_id", orderId);

  return { revoked: true, stars: award.stars_awarded };
}
