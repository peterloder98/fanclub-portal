import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { MerchandiseAdminNav } from "@/components/admin/merchandise/merchandise-admin-nav";
import { MerchandiseProductForm } from "@/components/admin/merchandise/merchandise-product-form.client";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminMerchandiseNewPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <Topbar title="Neuer Artikel" subtitle="Merchandise anlegen" />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink href="/admin/merchandise" label="← Merchandise" />
        <div className="mt-4">
          <MerchandiseAdminNav />
        </div>
        <div className="mt-6">
          <MerchandiseProductForm mode="create" />
        </div>
      </main>
    </div>
  );
}
