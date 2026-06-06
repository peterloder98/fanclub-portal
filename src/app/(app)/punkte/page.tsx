import { Topbar } from "@/components/app-shell/topbar";
import { ANNI_STARS_LABEL } from "@/lib/anni-stars/terminology";
import { PunktePageClient } from "@/components/points/punkte-page.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadYearLeaderboard } from "@/lib/points/year-leaderboard";
import { evaluateUserBadges } from "@/lib/badges/evaluate-user-badges";

export default async function PunktePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const leaderboard = await loadYearLeaderboard(supabase, user?.id ?? null, 10);
  const achievements = user ? await evaluateUserBadges(user.id).catch(() => []) : [];

  return (
    <div className="min-h-screen">
      <Topbar
        title={ANNI_STARS_LABEL}
        subtitle="Deine Anni-Stars, Rang, Historie, Erfolge — und wie das System funktioniert."
      />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
        <PunktePageClient leaderboard={leaderboard} achievements={achievements} />
      </main>
    </div>
  );
}
