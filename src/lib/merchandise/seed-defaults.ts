import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CLUB_DOCUMENTS_BUCKET } from "@/lib/images/specs";
import { createMerchandisePlaceholder } from "@/lib/merchandise/placeholder-image";

type SeedItem = {
  name: string;
  description: string;
  saleCents: number;
  purchaseCents: number | null;
  hasSizes: boolean;
  placeholderLabel: string;
  hue: number;
  variants: Array<{
    size_label: string | null;
    qty_purchased: number;
    qty_sold: number;
    qty_gifted: number;
  }>;
  ledgerDescription?: string;
};

const DEFAULT_ITEMS: SeedItem[] = [
  {
    name: "Kugelschreiber",
    description: "Fanclub-Kugelschreiber mit Logo — Geschenk an Mitglieder",
    saleCents: 0,
    purchaseCents: 850,
    hasSizes: false,
    placeholderLabel: "Kugelschreiber",
    hue: 210,
    variants: [{ size_label: null, qty_purchased: 50, qty_sold: 0, qty_gifted: 12 }],
    ledgerDescription: "Kugelschreiber mit Logo",
  },
  {
    name: "Fanclub T-Shirt",
    description: "Textil-Produkt mit verschiedenen Größen",
    saleCents: 2500,
    purchaseCents: 42000,
    hasSizes: true,
    placeholderLabel: "T-Shirt",
    hue: 16,
    variants: [
      { size_label: "S", qty_purchased: 5, qty_sold: 1, qty_gifted: 0 },
      { size_label: "M", qty_purchased: 10, qty_sold: 2, qty_gifted: 1 },
      { size_label: "L", qty_purchased: 8, qty_sold: 1, qty_gifted: 0 },
      { size_label: "XL", qty_purchased: 5, qty_sold: 0, qty_gifted: 0 },
      { size_label: "XXL", qty_purchased: 2, qty_sold: 0, qty_gifted: 0 },
    ],
  },
  {
    name: "Fanschal",
    description: "Schal in Fanclub-Farben",
    saleCents: 3000,
    purchaseCents: 2490,
    hasSizes: false,
    placeholderLabel: "Fanschal",
    hue: 330,
    variants: [{ size_label: null, qty_purchased: 50, qty_sold: 18, qty_gifted: 5 }],
    ledgerDescription: "Fanschals Bestellung",
  },
];

async function uploadPlaceholder(admin: ReturnType<typeof createSupabaseAdminClient>, slug: string, label: string, hue: number) {
  const buf = await createMerchandisePlaceholder(label, hue);
  const path = `merchandise/seed-${slug}.webp`;
  await admin.storage.from(CLUB_DOCUMENTS_BUCKET).upload(path, buf, {
    upsert: true,
    contentType: "image/webp",
  });
  return path;
}

export async function seedDefaultMerchandise(userId: string) {
  const admin = createSupabaseAdminClient();
  const { count } = await admin.from("merchandise_products").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return { seeded: false, reason: "already_exists" as const };

  for (const item of DEFAULT_ITEMS) {
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const imagePath = await uploadPlaceholder(admin, slug, item.placeholderLabel, item.hue);

    let ledgerEntryId: string | null = null;
    if (item.ledgerDescription) {
      const { data: existing } = await admin
        .from("club_ledger_entries")
        .select("id")
        .eq("description", item.ledgerDescription)
        .eq("category", "merchandise")
        .maybeSingle();
      ledgerEntryId = existing?.id ?? null;
    }

    if (!ledgerEntryId && item.purchaseCents && item.purchaseCents > 0) {
      const totalQty = item.variants.reduce((s, v) => s + v.qty_purchased, 0);
      const { data: ledgerRow } = await admin
        .from("club_ledger_entries")
        .insert({
          entry_type: "expense",
          amount_cents: item.purchaseCents,
          description: item.ledgerDescription ?? `Einkauf: ${item.name} (${totalQty} Stück)`,
          category: "merchandise",
          entry_date: "2026-03-20",
          created_by: userId,
        })
        .select("id")
        .single();
      ledgerEntryId = ledgerRow?.id ?? null;
    }

    const { data: product, error } = await admin
      .from("merchandise_products")
      .insert({
        name: item.name,
        description: item.description,
        sale_price_cents: item.saleCents,
        purchase_total_cents: item.purchaseCents,
        has_sizes: item.hasSizes,
        image_path: imagePath,
        ledger_entry_id: ledgerEntryId,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (product?.id) {
      await admin.from("merchandise_variants").insert(
        item.variants.map((v) => ({ product_id: product.id, ...v })),
      );
    }
  }

  return { seeded: true as const };
}
