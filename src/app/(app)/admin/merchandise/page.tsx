import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { MerchandiseAdminNav } from "@/components/admin/merchandise/merchandise-admin-nav";
import { MerchandiseProductList } from "@/components/admin/merchandise/merchandise-product-list.client";
import { requireAdmin } from "@/lib/admin/require-admin";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMerchandisePage() {
  if (!FEATURE_FLAGS.merchandise) redirect("/admin");

  await requireAdmin();

  return (
    <div className="min-h-screen">
      <Topbar title="Merchandise" subtitle="Shop-Admin — Artikel, Bestand & Bestellungen" />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <div className="mt-4">
          <MerchandiseAdminNav />
        </div>
        <div className="mt-6">
          <MerchandiseProductList />
        </div>
      </main>
    </div>
  );
}
