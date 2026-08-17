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
        .select("points,held_at")
        .eq("user_id", uid)
        .gte("created_at", yearStart);
      if (error) {
        // Fallback bevor Migration 123 läuft
        const { data: fb } = await supabase
          .from("points_transactions")
          .select("points")
          .eq("user_id", uid)
          .gte("created_at", yearStart);
        return (fb ?? []).reduce((s, r) => s + (r.points ?? 0), 0);
      }
      return (rows ?? [])
        .filter((r) => !(r as { held_at?: string | null }).held_at)
        .reduce((s, r) => s + (r.points ?? 0), 0);
    },
    [],
  );

  const syncFromDb = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    applyPoints(await refreshPoints(uid));
  }, [applyPoints, refreshPoints]);

  useEffect(() => {
    function onGain(e: Event) {
      const delta = (e as CustomEvent<PointsGainDetail>).detail?.delta ?? 0;
      if (!delta) return;

      // Nur DB-Stand anzeigen. Realtime hat die Buchung oft schon eingerechnet;
      // Fly-Animation +delta nochmal drauf ergab kurz 16/17 und sprang zurück.
      void syncFromDb();
    }

    window.addEventListener(POINTS_GAIN_EVENT, onGain);
    return () => window.removeEventListener(POINTS_GAIN_EVENT, onGain);
  }, [syncFromDb]);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      applyPoints(await refreshPoints(userId));
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
          void syncFromDb();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, syncFromDb]);

  return { points, rank, refreshPoints };
}
