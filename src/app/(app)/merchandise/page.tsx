import { Topbar } from "@/components/app-shell/topbar";
import { MerchandiseShop } from "@/components/merchandise/merchandise-shop.client";
import { getRequestAuth } from "@/lib/auth/request-auth";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MerchandisePage() {
  if (!FEATURE_FLAGS.merchandise) redirect("/dashboard");

  const { supabase, user } = await getRequestAuth();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <Topbar title="Merchandise" subtitle="Stöbern — Bestellungen laufen nicht über die App" />
      <main className="px-4 py-6 lg:px-8">
        <MerchandiseShop />
      </main>
    </div>
  );
}
