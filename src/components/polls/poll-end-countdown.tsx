"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCountdownVerbose } from "@/lib/countdown/format-countdown";
import { cn } from "@/lib/cn";

export function PollEndCountdown({
  endsAt,
  className,
  endedLabel = "Umfrage beendet",
  runningLabel = "Endet in",
}: {
  endsAt: string;
  className?: string;
  endedLabel?: string;
  runningLabel?: string;
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
        {ended ? endedLabel : runningLabel}
      </div>
      <div
        className={cn(
          "text-sm font-semibold leading-snug tabular-nums",
          ended ? "text-slate-500" : "text-slate-900",
        )}
      >
        {formatCountdownVerbose(secondsLeft)}
      </div>
    </div>
  );
}
