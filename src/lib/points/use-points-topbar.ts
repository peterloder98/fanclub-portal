"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { rankFromPoints } from "@/lib/points/rank";
import { POINTS_GAIN_EVENT, type PointsGainDetail } from "@/lib/points/events";

export function usePointsTopbar(userId: string | null) {
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState(rankFromPoints(0));
  const userIdRef = useRef(userId);
  const pointsRef = useRef(0);
  const expectedMinRef = useRef(0);
  const syncBlockedUntilRef = useRef(0);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  userIdRef.current = userId;

  const applyPoints = useCallback((next: number) => {
    const v = Math.max(0, next);
    pointsRef.current = v;
    setPoints(v);
    setRank(rankFromPoints(v));
  }, []);

  const refreshPoints = useCallback(
    async (uid: string): Promise<number> => {
      const supabase = createSupabaseBrowserClient();
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const { data: rows, error } = await supabase
        .from("points_transactions")
        .select("points")
        .eq("user_id", uid)
        .gte("created_at", yearStart);
      if (error) return pointsRef.current;
      return (rows ?? []).reduce((s, r) => s + (r.points ?? 0), 0);
    },
    [],
  );

  const syncFromDb = useCallback(
    async (attempt = 0) => {
      const uid = userIdRef.current;
      if (!uid) return;

      const dbSum = await refreshPoints(uid);
      const displayed = pointsRef.current;

      if (dbSum >= displayed || dbSum >= expectedMinRef.current) {
        expectedMinRef.current = 0;
        syncBlockedUntilRef.current = 0;
        applyPoints(dbSum);
        return;
      }

      // DB noch hinter optimistischer Anzeige (typisch bei +Punkten kurz nach Like/Umfrage)
      if (attempt < 10 && Date.now() < syncBlockedUntilRef.current + 12_000) {
        syncTimerRef.current = setTimeout(() => void syncFromDb(attempt + 1), 1200);
        return;
      }

      expectedMinRef.current = 0;
      syncBlockedUntilRef.current = 0;
      applyPoints(dbSum);
    },
    [applyPoints, refreshPoints],
  );

  const scheduleDbSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => void syncFromDb(0), 1800);
  }, [syncFromDb]);

  useEffect(() => {
    function onGain(e: Event) {
      const delta = (e as CustomEvent<PointsGainDetail>).detail?.delta ?? 0;
      if (!delta) return;

      syncBlockedUntilRef.current = Date.now() + 12_000;
      const next = Math.max(0, pointsRef.current + delta);
      if (delta > 0) {
        expectedMinRef.current = Math.max(expectedMinRef.current, next);
      }
      applyPoints(next);
      scheduleDbSync();
    }

    window.addEventListener(POINTS_GAIN_EVENT, onGain);
    return () => window.removeEventListener(POINTS_GAIN_EVENT, onGain);
  }, [applyPoints, scheduleDbSync]);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const sum = await refreshPoints(userId);
      applyPoints(sum);
    })();
  }, [userId, refreshPoints, applyPoints]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`points:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "points_transactions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (Date.now() < syncBlockedUntilRef.current) return;
          void syncFromDb(0);
        },
      )
      .subscribe();

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [userId, syncFromDb]);

  return { points, rank, refreshPoints };
}
