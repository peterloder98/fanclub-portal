"use client";

import { Badge } from "@/components/ui/badge";
import { useCountdown } from "@/lib/countdown/use-countdown";
import { cn } from "@/lib/cn";

export function RunningCountdownBadge({
  endsAt,
  paused = false,
  endedLabel = "Beendet",
  runningPrefix = "Läuft noch",
  pausedLabel = "Pausiert",
  inline = false,
  className,
}: {
  endsAt: string;
  paused?: boolean;
  endedLabel?: string;
  runningPrefix?: string;
  pausedLabel?: string;
  /** Kompakt in einer Zeile (z. B. Umfragen oben rechts) */
  inline?: boolean;
  className?: string;
}) {
  const { ended, text } = useCountdown(endsAt);

  if (paused) {
    return (
      <Badge variant="warning" className={cn("font-medium", className)}>
        {pausedLabel}
      </Badge>
    );
  }

  if (ended) {
    return (
      <Badge variant="neutral" className={className}>
        {endedLabel}
      </Badge>
    );
  }

  return (
    <Badge
      variant="brand"
      className={cn(
        inline
          ? "inline-flex max-w-full flex-nowrap items-center gap-x-1 whitespace-nowrap text-[10px] font-semibold leading-none"
          : "inline-flex max-w-full flex-nowrap items-center gap-x-1 whitespace-nowrap text-left text-[11px] font-semibold leading-none tracking-normal",
        className,
      )}
    >
      {runningPrefix ? (
        <span className={inline ? "shrink-0 font-medium opacity-90" : "block text-[10px] font-medium opacity-90"}>
          {runningPrefix}
        </span>
      ) : null}
      <span className={cn("tabular-nums", inline ? "text-right" : "block")}>{text}</span>
    </Badge>
  );
}
