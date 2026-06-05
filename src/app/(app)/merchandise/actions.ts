"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { variantAvailable } from "@/lib/merchandise/availability";
import { notifyAdminsMerchandiseOrder } from "@/lib/email/merchandise-order-notify";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { logMemberActivity, MEMBER_ACTIVITY_TYPES } from "@/lib/membership/activity-log";

const cartLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  qty: z.coerce.number().int().min(1).max(20),
});

const orderSchema = z.object({
  lines: z.array(cartLineSchema).min(1),
  buyerFirstName: z.string().min(1),
  buyerLastName: z.string().min(1),
  buyerEmail: z.string().email(),
  buyerPhone: z.string().optional(),
  buyerStreet: z.string().min(1),
  buyerPostalCode: z.string().min(1),
  buyerCity: z.string().min(1),
  buyerCountry: z.string().optional(),
});

export async function placeMerchandiseOrder(input: z.infer<typeof orderSchema>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Bitte einloggen.");

  const parsed = orderSchema.parse(input);
  const admin = createSupabaseAdminClient();

  const productIds = [...new Set(parsed.lines.map((l) => l.productId))];
  const { data: products } = await admin
    .from("merchandise_products")
    .select("id,name,sale_price_cents,has_sizes")
    .in("id", productIds)
    .gt("sale_price_cents", 0);

  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  if (productById.size !== productIds.length) {
    throw new Error("Ein oder mehrere Artikel sind nicht mehr verkäuflich.");
  }

  const { data: allVariants } = await admin
    .from("merchandise_variants")
    .select("id,product_id,size_label,qty_purchased,qty_sold,qty_gifted,qty_reserved")
    .in("product_id", productIds);
  const variantById = new Map((allVariants ?? []).map((v) => [v.id, v]));
  const variantsByProduct = new Map<string, typeof allVariants>();
  for (const v of allVariants ?? []) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  function resolveVariantId(line: (typeof parsed.lines)[0]) {
    const p = productById.get(line.productId)!;
    if (line.variantId) return line.variantId;
    if (!p.has_sizes) {
      const vs = variantsByProduct.get(line.productId) ?? [];
      if (vs.length === 1) return vs[0].id;
    }
    return null;
  }

  for (const line of parsed.lines) {
    const p = productById.get(line.productId)!;
    const variantId = resolveVariantId(line);
    if (!variantId) {
      throw new Error(`Bitte Größe für „${p.name}" wählen.`);
    }
    const v = variantById.get(variantId);
    if (!v || v.product_id !== line.productId) {
      throw new Error(`Ungültige Variante für „${p.name}".`);
    }
    if (variantAvailable(v) < line.qty) {
      throw new Error(`Nur noch ${variantAvailable(v)}× „${p.name}" verfügbar.`);
    }
  }

  const lineRows = parsed.lines.map((line) => {
    const p = productById.get(line.productId)!;
    const variantId = resolveVariantId(line)!;
    const v = variantById.get(variantId)!;
    const unit = p.sale_price_cents;
    return {
      product_id: line.productId,
      variant_id: variantId,
      product_name: p.name,
      size_label: v?.size_label ?? null,
      qty: line.qty,
      unit_price_cents: unit,
      line_total_cents: unit * line.qty,
      _variantId: variantId,
      _qty: line.qty,
    };
  });

  const totalCents = lineRows.reduce((s, r) => s + r.line_total_cents, 0);

  const { data: order, error: oErr } = await admin
    .from("merchandise_orders")
    .insert({
      user_id: user.id,
      status: "pending",
      buyer_first_name: parsed.buyerFirstName.trim(),
      buyer_last_name: parsed.buyerLastName.trim(),
      buyer_email: parsed.buyerEmail.trim(),
      buyer_phone: parsed.buyerPhone?.trim() || null,
      buyer_street: parsed.buyerStreet.trim(),
      buyer_postal_code: parsed.buyerPostalCode.trim(),
      buyer_city: parsed.buyerCity.trim(),
      buyer_country: parsed.buyerCountry?.trim() || "DE",
      total_cents: totalCents,
    })
    .select("id")
    .single();
  if (oErr) throw new Error(oErr.message);

  const { error: iErr } = await admin.from("merchandise_order_items").insert(
    lineRows.map(({ _variantId: _v, _qty: _q, ...row }) => ({
      ...row,
      order_id: order!.id,
    })),
  );
  if (iErr) throw new Error(iErr.message);

  for (const row of lineRows) {
    if (row.variant_id) {
      const v = variantById.get(row.variant_id)!;
      const { error: uErr } = await admin
        .from("merchandise_variants")
        .update({ qty_reserved: (v.qty_reserved ?? 0) + row.qty })
        .eq("id", row.variant_id);
      if (uErr) throw new Error(uErr.message);
    }
  }

  await admin.from("merchandise_order_events").insert({
    order_id: order!.id,
    event_type: "order_placed",
    title: "Bestellung eingegangen",
    details: `${lineRows.length} Position(en), ${(totalCents / 100).toFixed(2)} €`,
    created_by: user.id,
  });

  await logMemberActivity({
    userId: user.id,
    eventType: MEMBER_ACTIVITY_TYPES.merchandiseOrderPlaced,
    title: "Merchandise bestellt",
    details: lineRows.map((r) => `${r.qty}× ${r.product_name}`).join(", "),
    linkUrl: `/merchandise`,
    linkLabel: "Shop",
    createdBy: user.id,
    metadata: { order_id: order!.id },
  }).catch(() => {});

  await notifyAdminsMerchandiseOrder({
    orderId: order!.id,
    buyerFirstName: parsed.buyerFirstName,
    buyerLastName: parsed.buyerLastName,
    items: lineRows.map((r) => ({
      qty: r.qty,
      productName: r.product_name,
      sizeLabel: r.size_label,
      lineTotalCents: r.line_total_cents,
    })),
  }).catch((e) => console.error("[merchandise] admin mail:", e));

  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  await createUserNotification({
    userId: user.id,
    kind: NOTIFICATION_KINDS.merchandiseOrderConfirmed,
    title: "Bestellung eingegangen",
    body: `Deine Merchandise-Bestellung (${(totalCents / 100).toFixed(2).replace(".", ",")} €) wurde bestätigt.`,
    linkUrl: base ? `${base}/merchandise` : "/merchandise",
    linkLabel: "Zum Shop",
    metadata: { order_id: order!.id },
  }).catch(console.error);

  revalidatePath("/merchandise");
  revalidatePath("/admin/merchandise");
  return { ok: true, orderId: order!.id };
}
