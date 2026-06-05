import { Topbar } from "@/components/app-shell/topbar";
import { MerchandiseShop } from "@/components/merchandise/merchandise-shop.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MerchandisePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <Topbar title="Merchandise" subtitle="Fanclub-Shop — Artikel, Größen & Verfügbarkeit" />
      <main className="px-4 py-6 lg:px-8">
        <MerchandiseShop />
      </main>
    </div>
  );
}
