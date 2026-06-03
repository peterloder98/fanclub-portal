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
  className,
}: {
  endsAt: string;
  paused?: boolean;
  endedLabel?: string;
  runningPrefix?: string;
  pausedLabel?: string;
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
      className={cn("max-w-full font-mono text-[11px] tabular-nums tracking-tight", className)}
    >
      <span className="font-sans font-semibold">{runningPrefix}</span> {text}
    </Badge>
  );
}
