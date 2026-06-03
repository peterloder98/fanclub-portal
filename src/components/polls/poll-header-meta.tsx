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
  /** „Ende: …“ unter den Badges (Dashboard-Umfragen) */
  showEndDate?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <h3
        className={cn(
          "font-semibold text-slate-900",
          compact ? "text-xs leading-snug" : "text-base",
        )}
      >
        {question}
      </h3>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <RunningCountdownBadge
          endsAt={endsAt}
          endedLabel="Umfrage beendet"
          className={compact ? "!px-1.5 !py-0.5 !text-[10px]" : undefined}
        />
        {allowMultiple ? (
          <Badge variant="neutral" className={compact ? "!px-1.5 !py-0.5 !text-[10px]" : undefined}>
            Mehrere Antworten möglich
          </Badge>
        ) : null}
        {hasVoted && !ended ? (
          <Badge variant="success" className={compact ? "!px-1.5 !py-0.5 !text-[10px]" : undefined}>
            Abgestimmt
          </Badge>
        ) : null}
      </div>
      {showEndDate ? (
        <p className={cn("mt-1 text-slate-500", compact ? "text-[10px]" : "text-xs")}>
          Ende:{" "}
          {new Date(endsAt).toLocaleString("de-DE", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      ) : null}
    </div>
  );
}
