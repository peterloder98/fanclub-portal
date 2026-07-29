"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ANNI_STAR_SYMBOL } from "@/lib/anni-stars/format";
import { cn } from "@/lib/cn";
import { POINTS_GAIN_EVENT, type PointsGainDetail } from "@/lib/points/events";
import { getPointsTargetElement } from "@/lib/points/target";

type Burst = { id: number; delta: number; x: number; y: number };

export function PointsBurst({ className }: { className?: string }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onGain(e: Event) {
      const delta = (e as CustomEvent<PointsGainDetail>).detail?.delta ?? 0;
      if (!delta) return;
      const target = getPointsTargetElement();
      const rect = target?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 72;
      const y = rect ? rect.top + 4 : 16;
      const id = Date.now() + Math.random();
      setBursts((b) => [...b, { id, delta, x, y }]);
      window.setTimeout(() => {
        setBursts((b) => b.filter((item) => item.id !== id));
      }, 700);
    }
    window.addEventListener(POINTS_GAIN_EVENT, onGain);
    return () => window.removeEventListener(POINTS_GAIN_EVENT, onGain);
  }, []);

  if (!mounted || !bursts.length) return null;

  return createPortal(
    <div className={cn("pointer-events-none fixed inset-0 z-[10045]", className)} aria-hidden>
      {bursts.map((b) => (
        <span
          key={b.id}
          className={cn(
            "absolute whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold shadow-md",
            b.delta >= 0
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300/80"
              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
          )}
          style={{
            left: b.x,
            top: b.y,
            transform: "translate(-50%, 0)",
            animation: "fc-points-pop 0.55s ease-out forwards",
          }}
        >
          <span>
            {b.delta >= 0 ? "+" : "−"}
            {Math.abs(b.delta)}
          </span>{" "}
          <span className={b.delta >= 0 ? "text-fc-gold" : "text-rose-400"}>
            {ANNI_STAR_SYMBOL}
          </span>
        </span>
      ))}
    </div>,
    document.body,
  );
}
