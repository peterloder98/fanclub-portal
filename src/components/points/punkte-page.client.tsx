"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PointsSummaryHeader } from "@/components/points/points-summary-header";
import { PointsHistoryList } from "@/components/points/points-history-list";
import { PointsGuideCard } from "@/components/points/points-guide-card";
import { PointsLeaderboard } from "@/components/points/points-leaderboard";
import type { YearLeaderboardData } from "@/lib/points/year-leaderboard";

export function PunktePageClient({ leaderboard }: { leaderboard: YearLeaderboardData }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    })();
  }, [supabase]);

  return (
    <div className="space-y-6">
      <PointsSummaryHeader userId={userId} />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <PointsHistoryList userId={userId} />
        <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/5">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-base font-semibold text-slate-900">Statuspunkte-Rangliste</h3>
            <p className="mt-0.5 text-xs text-slate-600">Top 10 — aktuelles Kalenderjahr</p>
          </div>
          <ol className="max-h-[min(320px,40vh)] overflow-y-auto overscroll-contain px-2 py-2">
            <PointsLeaderboard data={leaderboard} />
          </ol>
        </section>
      </div>
      <PointsGuideCard />
    </div>
  );
}
