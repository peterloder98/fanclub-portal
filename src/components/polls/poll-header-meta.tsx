"use client";

import { Badge } from "@/components/ui/badge";
import { RunningCountdownBadge } from "@/components/ui/running-countdown-badge";
import { cn } from "@/lib/cn";

export function PollHeaderMeta({
  question,
  endsAt,
  allowMultiple,
  hasVoted,
  ended,
  compact = false,
  showEndDate = true,
  className,
}: {
  question: string;
  endsAt: string;
  allowMultiple: boolean;
  hasVoted: boolean;
  ended?: boolean;
  compact?: boolean;
  showEndDate?: boolean;
  className?: string;
}) {
  const endLabel = new Date(endsAt).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-start justify-between gap-2">
        <h3
          className={cn(
            "min-w-0 flex-1 font-semibold text-slate-900",
            compact ? "text-xs leading-snug" : "text-base",
          )}
        >
          {question}
        </h3>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <RunningCountdownBadge
            endsAt={endsAt}
            endedLabel="Umfrage beendet"
            className={compact ? "!px-1.5 !py-0.5 !text-[10px]" : undefined}
          />
          {showEndDate ? (
            <p className={cn("text-right text-slate-500", compact ? "text-[10px]" : "text-xs")}>
              Ende: {endLabel}
            </p>
          ) : null}
        </div>
      </div>
      {allowMultiple || (hasVoted && !ended) ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {allowMultiple ? (
            <Badge
              variant="neutral"
              className={compact ? "!px-1.5 !py-0.5 !text-[10px]" : undefined}
            >
              Mehrere Antworten möglich
            </Badge>
          ) : null}
          {hasVoted && !ended ? (
            <Badge
              variant="success"
              className={compact ? "!px-1.5 !py-0.5 !text-[10px]" : undefined}
            >
              Abgestimmt
            </Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
