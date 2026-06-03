import { Suspense } from "react";
import { Topbar } from "@/components/app-shell/topbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GiveawayBoard } from "@/components/giveaways/giveaway-board";
import { loadGiveawayListItems } from "@/lib/giveaways/load-list";
import { processEndedGiveaways } from "./actions";

export default async function GiveawaysPage() {
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
  const isAdmin = me?.role === "admin";

  if (isAdmin) {
    try {
      await processEndedGiveaways();
    } catch {
      /* Tabelle evtl. noch nicht migriert */
    }
  }

  let items: Awaited<ReturnType<typeof loadGiveawayListItems>> = [];
  try {
    items = await loadGiveawayListItems(user.id);
  } catch {
    items = [];
  }

  return (
    <div className="min-h-screen">
      <Topbar
        title="Gewinnspiele"
        subtitle={
          isAdmin
            ? "Aktive & beendete Gewinnspiele verwalten, neue anlegen."
            : "Teilnehmen und Gewinner entdecken."
        }
      />
      <main className="px-4 py-6 lg:px-8">
        <Suspense fallback={<div className="text-sm text-slate-600">Lade…</div>}>
          <GiveawayBoard items={items} isAdmin={isAdmin} />
        </Suspense>
      </main>
    </div>
  );
}
