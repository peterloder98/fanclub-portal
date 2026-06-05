import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { MerchandiseAdminNav } from "@/components/admin/merchandise/merchandise-admin-nav";
import { MerchandiseProductForm } from "@/components/admin/merchandise/merchandise-product-form.client";
import { getMerchandiseProductAction } from "@/app/(app)/admin/merchandise/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMerchandiseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  const product = await getMerchandiseProductAction(id);
  if (!product) notFound();

  return (
    <div className="min-h-screen">
      <Topbar title={`${product.name} bearbeiten`} subtitle="Stammdaten & Bestand" />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink href={`/admin/merchandise/${id}`} label="← Artikeldetails" />
        <div className="mt-4">
          <MerchandiseAdminNav />
        </div>
        <div className="mt-6">
          <MerchandiseProductForm mode="edit" product={product} />
        </div>
      </main>
    </div>
  );
}
