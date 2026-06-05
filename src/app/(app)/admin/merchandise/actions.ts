"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signedClubDocumentUrl } from "@/lib/club/documents";
import { seedDefaultMerchandise } from "@/lib/merchandise/seed-defaults";

export type MerchandiseVariantInput = {
  size_label: string | null;
  qty_purchased: number;
  qty_sold: number;
  qty_gifted: number;
};

export type MerchandiseProductRow = {
  id: string;
  name: string;
  description: string | null;
  sale_price_cents: number;
  purchase_total_cents: number | null;
  image_path: string | null;
  image_url: string | null;
  has_sizes: boolean;
  ledger_entry_id: string | null;
  variants: Array<{
    id: string;
    size_label: string | null;
    qty_purchased: number;
    qty_sold: number;
    qty_gifted: number;
    available: number;
  }>;
  total_available: number;
};

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  salePriceEur: z.coerce.number().min(0),
  purchaseTotalEur: z.coerce.number().min(0).optional().nullable(),
  hasSizes: z.boolean(),
  imagePath: z.string().optional().nullable(),
  ledgerEntryId: z.string().uuid().optional().nullable(),
  createPurchaseExpense: z.boolean().optional().default(false),
  variants: z.array(
    z.object({
      size_label: z.string().nullable(),
      qty_purchased: z.coerce.number().int().min(0),
      qty_sold: z.coerce.number().int().min(0),
      qty_gifted: z.coerce.number().int().min(0),
    }),
  ),
});

export async function listMerchandiseProductsAction(): Promise<{
  products: MerchandiseProductRow[];
  tableMissing: boolean;
}> {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("merchandise_products")
    .select("id,name,description,sale_price_cents,purchase_total_cents,image_path,has_sizes,ledger_entry_id")
    .order("name", { ascending: true });
  if (error) {
    if (/merchandise_products|does not exist/i.test(error.message)) {
      return { products: [], tableMissing: true };
    }
    throw new Error(error.message);
  }

  const ids = (data ?? []).map((p) => p.id);
  const { data: variants } = ids.length
    ? await admin
        .from("merchandise_variants")
        .select("id,product_id,size_label,qty_purchased,qty_sold,qty_gifted")
        .in("product_id", ids)
    : { data: [] };

  const variantsByProduct = new Map<string, typeof variants>();
  for (const v of variants ?? []) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  const products: MerchandiseProductRow[] = await Promise.all(
    (data ?? []).map(async (p) => {
      const vs = (variantsByProduct.get(p.id) ?? []).map((v) => ({
        id: v.id,
        size_label: v.size_label,
        qty_purchased: v.qty_purchased,
        qty_sold: v.qty_sold,
        qty_gifted: v.qty_gifted,
        available: Math.max(0, v.qty_purchased - v.qty_sold - v.qty_gifted),
      }));
      const total_available = vs.reduce((s, v) => s + v.available, 0);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        sale_price_cents: p.sale_price_cents,
        purchase_total_cents: p.purchase_total_cents,
        image_path: p.image_path,
        image_url: await signedClubDocumentUrl(p.image_path),
        has_sizes: p.has_sizes,
        ledger_entry_id: (p as { ledger_entry_id?: string | null }).ledger_entry_id ?? null,
        variants: vs,
        total_available,
      };
    }),
  );

  return { products, tableMissing: false };
}

export async function saveMerchandiseProductAction(input: {
  id?: string | null;
  name: string;
  description?: string;
  salePriceEur: number;
  purchaseTotalEur?: number | null;
  hasSizes: boolean;
  imagePath?: string | null;
  ledgerEntryId?: string | null;
  createPurchaseExpense?: boolean;
  variants: MerchandiseVariantInput[];
}) {
  const { user } = await requireAdminAction();
  const parsed = productSchema.parse(input);
  const admin = createSupabaseAdminClient();
  const saleCents = Math.round(parsed.salePriceEur * 100);
  const purchaseCents =
    parsed.purchaseTotalEur != null ? Math.round(parsed.purchaseTotalEur * 100) : null;

  let productId = input.id ?? null;
  if (productId) {
    const { error } = await admin
      .from("merchandise_products")
      .update({
        name: parsed.name.trim(),
        description: parsed.description.trim() || null,
        sale_price_cents: saleCents,
        purchase_total_cents: purchaseCents,
        has_sizes: parsed.hasSizes,
        image_path: parsed.imagePath ?? null,
        ledger_entry_id: parsed.ledgerEntryId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);
    if (error) throw new Error(error.message);
    await admin.from("merchandise_variants").delete().eq("product_id", productId);
  } else {
    const { data, error } = await admin
      .from("merchandise_products")
      .insert({
        name: parsed.name.trim(),
        description: parsed.description.trim() || null,
        sale_price_cents: saleCents,
        purchase_total_cents: purchaseCents,
        has_sizes: parsed.hasSizes,
        image_path: parsed.imagePath ?? null,
        ledger_entry_id: parsed.ledgerEntryId ?? null,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    productId = data?.id ?? null;
  }

  if (!productId) throw new Error("Produkt konnte nicht gespeichert werden.");

  const variantRows = parsed.variants.map((v) => ({
    product_id: productId,
    size_label: v.size_label?.trim() || null,
    qty_purchased: v.qty_purchased,
    qty_sold: v.qty_sold,
    qty_gifted: v.qty_gifted,
  }));
  if (variantRows.length) {
    const { error: vErr } = await admin.from("merchandise_variants").insert(variantRows);
    if (vErr) throw new Error(vErr.message);
  }

  if (!parsed.ledgerEntryId && purchaseCents && purchaseCents > 0 && parsed.createPurchaseExpense) {
    const totalQty = parsed.variants.reduce((s, v) => s + v.qty_purchased, 0);
    const { data: ledgerRow } = await admin
      .from("club_ledger_entries")
      .insert({
        entry_type: "expense",
        amount_cents: purchaseCents,
        description: `Einkauf: ${parsed.name.trim()} (${totalQty} Stück)`,
        category: "merchandise",
        entry_date: new Date().toISOString().slice(0, 10),
        created_by: user.id,
      })
      .select("id")
      .single();
    if (ledgerRow?.id) {
      await admin
        .from("merchandise_products")
        .update({ ledger_entry_id: ledgerRow.id })
        .eq("id", productId);
    }
  }

  revalidatePath("/admin/merchandise");
  revalidatePath("/admin/accounting");
  return { ok: true, id: productId };
}

export async function listMerchandiseExpenseOptionsAction() {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("club_ledger_entries")
    .select("id,description,amount_cents,entry_date")
    .eq("entry_type", "expense")
    .eq("category", "merchandise")
    .order("entry_date", { ascending: false })
    .limit(40);
  if (error) {
    if (/club_ledger_entries|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    label: `${r.description} (${(r.amount_cents / 100).toFixed(2).replace(".", ",")} €, ${r.entry_date})`,
  }));
}

export async function seedMerchandiseDefaultsAction() {
  const { user } = await requireAdminAction();
  const result = await seedDefaultMerchandise(user.id);
  revalidatePath("/admin/merchandise");
  revalidatePath("/admin/accounting");
  return result;
}

export async function deleteMerchandiseProductAction(productId: string) {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("merchandise_products").delete().eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/merchandise");
  return { ok: true };
}
