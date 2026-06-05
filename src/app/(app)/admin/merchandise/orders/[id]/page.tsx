import Link from "next/link";
import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { MerchandiseAdminNav } from "@/components/admin/merchandise/merchandise-admin-nav";
import { MerchandiseOrderDetail } from "@/components/admin/merchandise-order-detail.client";
import { getMerchandiseOrderAction } from "@/app/(app)/admin/merchandise/order-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MerchandiseOrderDetailPage({
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

  const order = await getMerchandiseOrderAction(id);
  if (!order) notFound();

  return (
    <div className="min-h-screen">
      <Topbar
        title={`Bestellung ${order.buyer_first_name} ${order.buyer_last_name}`}
        subtitle="Details, Käuferdaten & Historie"
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink href="/admin/merchandise/orders" label="Zurück zur Bestellliste" />
        <div className="mt-4">
          <MerchandiseAdminNav />
        </div>
        <div className="mt-6">
          <MerchandiseOrderDetail initial={order} />
        </div>
        <p className="mt-6 text-xs text-slate-500">
          <Link href="/admin/merchandise/orders" className="text-blue-600 hover:underline">
            Alle Bestellungen
          </Link>
        </p>
      </main>
    </div>
  );
}
