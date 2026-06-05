"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signedClubDocumentUrl } from "@/lib/club/documents";
import { variantAvailable } from "@/lib/merchandise/availability";

export type ShopProduct = {
  id: string;
  name: string;
  description: string | null;
  sale_price_cents: number;
  image_url: string | null;
  has_sizes: boolean;
  variants: Array<{
    id: string;
    size_label: string | null;
    available: number;
  }>;
  total_available: number;
};

export async function listShopProductsAction(): Promise<{
  products: ShopProduct[];
  tableMissing: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Bitte einloggen.");

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("merchandise_products")
    .select("id,name,description,sale_price_cents,image_path,has_sizes")
    .gt("sale_price_cents", 0)
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

  const variantsByProduct = new Map<string, typeof variants>();
  for (const v of variants ?? []) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  const products: ShopProduct[] = await Promise.all(
    (data ?? []).map(async (p) => {
      const vs = (variantsByProduct.get(p.id) ?? []).map((v) => ({
        id: v.id,
        size_label: v.size_label,
        available: variantAvailable(v),
      }));
      const total_available = vs.reduce((s, v) => s + v.available, 0);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        sale_price_cents: p.sale_price_cents,
        image_url: await signedClubDocumentUrl(p.image_path),
        has_sizes: p.has_sizes,
        variants: vs,
        total_available,
      };
    }),
  );

  return { products, tableMissing: false };
}

export async function loadShopProfileAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("first_name,last_name,email,phone,street,postal_code,city,country")
    .eq("id", user.id)
    .maybeSingle();
  return data;
}
