"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = Math.floor(s % 60);
  return `${pad2(days)}:${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

export function PollEndCountdown({
  endsAt,
  className,
}: {
  endsAt: string;
  className?: string;
}) {
  const target = useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ended = !Number.isFinite(target) || target <= now;
  const secondsLeft = ended ? 0 : Math.max(0, Math.floor((target - now) / 1000));

  return (
    <div className={cn("grid gap-0.5", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {ended ? "Umfrage beendet" : "Endet in"}
      </div>
      <div
        className={cn(
          "font-mono text-lg font-semibold tracking-tight tabular-nums",
          ended ? "text-slate-500" : "text-slate-900",
        )}
      >
        {formatCountdown(secondsLeft)}
      </div>
    </div>
  );
}
