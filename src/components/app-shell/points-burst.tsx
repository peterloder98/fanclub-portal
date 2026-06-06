"use client";

import { useEffect, useState } from "react";
import { ANNI_STAR_SYMBOL } from "@/lib/anni-stars/format";
import { cn } from "@/lib/cn";
import { POINTS_GAIN_EVENT, type PointsGainDetail } from "@/lib/points/events";

type Burst = { id: number; delta: number };

export function PointsBurst({ className }: { className?: string }) {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    function onGain(e: Event) {
      const delta = (e as CustomEvent<PointsGainDetail>).detail?.delta ?? 0;
      if (!delta) return;
      const id = Date.now() + Math.random();
      setBursts((b) => [...b, { id, delta }]);
      window.setTimeout(() => {
        setBursts((b) => b.filter((x) => x.id !== id));
      }, 520);
    }
    window.addEventListener(POINTS_GAIN_EVENT, onGain);
    return () => window.removeEventListener(POINTS_GAIN_EVENT, onGain);
  }, []);

  if (!bursts.length) return null;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-visible", className)}>
      {bursts.map((b) => (
        <span
          key={b.id}
          className={cn(
            "absolute left-1/2 top-0 -translate-x-1/2 animate-fc-points-pop whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold shadow-md",
            b.delta >= 0
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300/80"
              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
          )}
        >
          <span className={b.delta >= 0 ? "text-emerald-700" : ""}>
            {b.delta >= 0 ? "+" : "−"}
            {Math.abs(b.delta)}
          </span>{" "}
          <span className={b.delta >= 0 ? "text-fc-gold" : "text-rose-400"}>
            {ANNI_STAR_SYMBOL}
          </span>
        </span>
      ))}
    </div>
  );
}
