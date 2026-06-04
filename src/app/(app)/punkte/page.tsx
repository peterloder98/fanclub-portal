import { Topbar } from "@/components/app-shell/topbar";
import { PunktePageClient } from "@/components/points/punkte-page.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadYearLeaderboard } from "@/lib/points/year-leaderboard";

export default async function PunktePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const leaderboard = await loadYearLeaderboard(supabase, user?.id ?? null, 10);

  return (
    <div className="min-h-screen">
      <Topbar
        title="Statuspunkte"
        subtitle="Deine Punkte, Rang, Historie — und wie das System funktioniert."
      />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
        <PunktePageClient leaderboard={leaderboard} />
      </main>
    </div>
  );
}
