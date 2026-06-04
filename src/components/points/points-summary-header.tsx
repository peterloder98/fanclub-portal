"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Trophy } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { rankFromPoints } from "@/lib/points/rank";
import { POINTS_YEAR_END_NOTE } from "@/lib/points/values";

export function PointsSummaryHeader({ userId }: { userId: string | null }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [points, setPoints] = useState<number | null>(null);
  const [rank, setRank] = useState("Fan");

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const { data: rows } = await supabase
        .from("points_transactions")
        .select("points")
        .eq("user_id", userId)
        .gte("created_at", yearStart);
      const sum = (rows ?? []).reduce((s, r) => s + (r.points ?? 0), 0);
      setPoints(sum);
      setRank(rankFromPoints(sum));
    })();
  }, [supabase, userId]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50 via-white to-rose-50/80 px-5 py-5 shadow-sm shadow-amber-900/10">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-sm">
            <Trophy className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Jahres-Sonderverlosung</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{POINTS_YEAR_END_NOTE}</p>
            <p className="mt-2 text-sm font-semibold text-amber-900">
              Die zehn Mitglieder mit den meisten Statuspunkten im abgelaufenen Jahr nehmen automatisch
              teil — du musst nichts extra anmelden.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-rose-500 text-white">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Deine Punkte (dieses Jahr)</div>
            <div className="text-2xl font-bold tabular-nums text-slate-900">
              {points === null ? "…" : points}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white">
            <Trophy className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Dein Rang</div>
            <div className="text-2xl font-bold text-slate-900">{rank}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
