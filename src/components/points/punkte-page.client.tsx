"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PointsSummaryHeader } from "@/components/points/points-summary-header";
import { PointsHistoryList } from "@/components/points/points-history-list";
import { PointsGuideCard } from "@/components/points/points-guide-card";

export function PunktePageClient() {
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
      <PointsHistoryList userId={userId} />
      <PointsGuideCard />
    </div>
  );
}
