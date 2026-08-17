"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  berlinCalendarMonth,
  berlinCalendarYear,
  defaultPointsYearForYearEndRun,
} from "@/lib/points/year-bounds";

export function PreviousYearArchiveBanner({ userId }: { userId: string | null }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (berlinCalendarMonth() > 3) return;
    const year = defaultPointsYearForYearEndRun();
    if (year >= berlinCalendarYear()) return;

    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: meta } = await supabase
        .from("points_year_archive_meta")
        .select("year,lottery_completed_at")
        .eq("year", year)
        .maybeSingle();
      if (!meta || meta.lottery_completed_at) return;

      const { data: row } = await supabase
        .from("points_year_archives")
        .select("points")
        .eq("year", year)
        .eq("user_id", userId)
        .maybeSingle();

      const pts = row?.points ?? 0;
      setText(
        `Dein Ergebnis ${year}: ${pts} Anni-Stars — gespeichert für die Jahres-Sonderverlosung. Die Sterne ${berlinCalendarYear()} zählen oben neu bei null.`,
      );
    })();
  }, [userId]);

  if (!text) return null;

  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-slate-700">
      {text}
    </p>
  );
}
