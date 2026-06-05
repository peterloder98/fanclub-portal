import Link from "next/link";
import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { MerchandiseOrdersPanel } from "@/components/admin/merchandise-orders-panel.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MerchandiseOrdersPage() {
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

  return (
    <div className="min-h-screen">
      <Topbar title="Merchandise-Bestellungen" subtitle="Eingegangene Bestellungen verwalten" />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink href="/admin/merchandise" label="Zurück zu Merchandise" />
        <div className="mt-4 flex gap-3 text-sm">
          <Link href="/admin/merchandise" className="font-semibold text-slate-600 hover:underline">
            Artikel
          </Link>
          <span className="font-semibold text-slate-900">Bestellungen</span>
        </div>
        <div className="mt-4">
          <MerchandiseOrdersPanel />
        </div>
      </main>
    </div>
  );
}
