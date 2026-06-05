"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signedClubDocumentUrl } from "@/lib/club/documents";
import { seedDefaultMerchandise } from "@/lib/merchandise/seed-defaults";
import { createMerchandisePlaceholder } from "@/lib/merchandise/placeholder-image";
import { variantAvailable } from "@/lib/merchandise/availability";
import { CLUB_DOCUMENTS_BUCKET } from "@/lib/images/specs";

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
    qty_reserved: number;
    available: number;
  }>;
  total_available: number;
  total_reserved: number;
  total_sold: number;
  total_gifted: number;
  ledger_entry_ids: string[];
  stock_receipts: Array<{
    id: string;
    qty_added: number;
    note: string | null;
    created_at: string;
    ledger_entry_id: string | null;
    size_label: string | null;
  }>;
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
        .select("id,product_id,size_label,qty_purchased,qty_sold,qty_gifted,qty_reserved")
        .in("product_id", ids)
    : { data: [] };

  const { data: ledgerLinks } = ids.length
    ? await admin
        .from("merchandise_product_ledger_links")
        .select("product_id,ledger_entry_id")
        .in("product_id", ids)
    : { data: [] };
  const linksByProduct = new Map<string, string[]>();
  for (const l of ledgerLinks ?? []) {
    const list = linksByProduct.get(l.product_id) ?? [];
    list.push(l.ledger_entry_id);
    linksByProduct.set(l.product_id, list);
  }

  const { data: receipts } = ids.length
    ? await admin
        .from("merchandise_stock_receipts")
        .select("id,product_id,qty_added,note,created_at,ledger_entry_id,variant_id")
        .in("product_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] };
  const variantLabelById = new Map(
    (variants ?? []).map((v) => [v.id, v.size_label]),
  );

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
        qty_reserved: v.qty_reserved ?? 0,
        available: variantAvailable(v),
      }));
      const total_available = vs.reduce((s, v) => s + v.available, 0);
      const total_reserved = vs.reduce((s, v) => s + (v.qty_reserved ?? 0), 0);
      const total_sold = vs.reduce((s, v) => s + v.qty_sold, 0);
      const total_gifted = vs.reduce((s, v) => s + v.qty_gifted, 0);
      const productReceipts = (receipts ?? [])
        .filter((r) => r.product_id === p.id)
        .map((r) => ({
          id: r.id,
          qty_added: r.qty_added,
          note: r.note,
          created_at: r.created_at,
          ledger_entry_id: r.ledger_entry_id,
          size_label: r.variant_id ? variantLabelById.get(r.variant_id) ?? null : null,
        }));
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
        total_reserved,
        total_sold,
        total_gifted,
        ledger_entry_ids: linksByProduct.get(p.id) ?? [],
        stock_receipts: productReceipts,
      };
    }),
  );

  return { products, tableMissing: false };
}

export async function getMerchandiseProductAction(
  productId: string,
): Promise<MerchandiseProductRow | null> {
  const { products } = await listMerchandiseProductsAction();
  return products.find((p) => p.id === productId) ?? null;
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
      await admin.from("merchandise_product_ledger_links").upsert({
        product_id: productId,
        ledger_entry_id: ledgerRow.id,
      });
    }
  }

  if (parsed.ledgerEntryId) {
    await admin.from("merchandise_product_ledger_links").upsert({
      product_id: productId,
      ledger_entry_id: parsed.ledgerEntryId,
    });
  }

  revalidatePath("/admin/merchandise");
  revalidatePath(`/admin/merchandise/${productId}`);
  revalidatePath(`/admin/merchandise/${productId}/edit`);
  revalidatePath("/admin/accounting");
  revalidatePath("/merchandise");
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

export async function refreshMerchandiseImagesAction() {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data: products, error } = await admin.from("merchandise_products").select("id,name");
  if (error) throw new Error(error.message);

  for (const p of products ?? []) {
    const seed = `${p.id}-${Math.random().toString(36).slice(2, 8)}`;
    const buf = await createMerchandisePlaceholder(p.name, seed);
    const path = `merchandise/${p.id}.webp`;
    await admin.storage.from(CLUB_DOCUMENTS_BUCKET).upload(path, buf, {
      upsert: true,
      contentType: "image/webp",
    });
    await admin.from("merchandise_products").update({ image_path: path }).eq("id", p.id);
  }

  revalidatePath("/admin/merchandise");
  return { ok: true, count: products?.length ?? 0 };
}

export async function seedMerchandiseDefaultsAction() {
  const { user } = await requireAdminAction();
  const result = await seedDefaultMerchandise(user.id);
  revalidatePath("/admin/merchandise");
  revalidatePath("/admin/accounting");
  return result;
}

export async function addStockReceiptAction(input: {
  productId: string;
  variantId?: string | null;
  qtyAdded: number;
  ledgerEntryId?: string | null;
  purchaseTotalEur?: number | null;
  createPurchaseExpense?: boolean;
  note?: string;
}) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const qty = Math.round(input.qtyAdded);
  if (qty <= 0) throw new Error("Menge muss größer als 0 sein.");

  const { data: product } = await admin
    .from("merchandise_products")
    .select("id,name")
    .eq("id", input.productId)
    .maybeSingle();
  if (!product) throw new Error("Artikel nicht gefunden.");

  let variantId = input.variantId ?? null;
  if (!variantId) {
    const { data: vs } = await admin
      .from("merchandise_variants")
      .select("id")
      .eq("product_id", input.productId);
    if ((vs ?? []).length === 1) variantId = vs![0].id;
  }
  if (!variantId) throw new Error("Bitte Variante/Größe für die Nachbestellung wählen.");

  const { data: variant } = await admin
    .from("merchandise_variants")
    .select("qty_purchased,size_label")
    .eq("id", variantId)
    .maybeSingle();
  if (!variant) throw new Error("Variante nicht gefunden.");

  let ledgerId = input.ledgerEntryId ?? null;
  if (!ledgerId && input.createPurchaseExpense && input.purchaseTotalEur) {
    const purchaseCents = Math.round(input.purchaseTotalEur * 100);
    const { data: ledgerRow } = await admin
      .from("club_ledger_entries")
      .insert({
        entry_type: "expense",
        amount_cents: purchaseCents,
        description: `Nachbestellung: ${product.name} (+${qty} Stück)`,
        category: "merchandise",
        entry_date: new Date().toISOString().slice(0, 10),
        created_by: user.id,
      })
      .select("id")
      .single();
    ledgerId = ledgerRow?.id ?? null;
  }

  await admin
    .from("merchandise_variants")
    .update({ qty_purchased: variant.qty_purchased + qty })
    .eq("id", variantId);

  await admin.from("merchandise_stock_receipts").insert({
    product_id: input.productId,
    variant_id: variantId,
    qty_added: qty,
    ledger_entry_id: ledgerId,
    note: input.note?.trim() || null,
    created_by: user.id,
  });

  if (ledgerId) {
    await admin.from("merchandise_product_ledger_links").upsert({
      product_id: input.productId,
      ledger_entry_id: ledgerId,
    });
  }

  revalidatePath("/admin/merchandise");
  revalidatePath(`/admin/merchandise/${input.productId}`);
  revalidatePath("/admin/accounting");
  revalidatePath("/merchandise");
  return { ok: true };
}

export async function deleteMerchandiseProductAction(productId: string) {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("merchandise_products").delete().eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/merchandise");
  return { ok: true };
}
