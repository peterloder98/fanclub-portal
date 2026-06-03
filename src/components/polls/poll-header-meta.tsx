"use client";

import type { ReactNode } from "react";
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
  icon,
  className,
}: {
  question: string;
  endsAt: string;
  allowMultiple: boolean;
  hasVoted: boolean;
  ended?: boolean;
  compact?: boolean;
  showEndDate?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  const endLabel = new Date(endsAt).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const badgeSize = compact ? "!text-[10px] !px-1.5 !py-0" : undefined;
  const countdownSize = compact ? "!px-1.5 !py-0.5 !text-[10px]" : undefined;
  const endDateSize = compact ? "text-[10px]" : "text-xs";

  return (
    <header className={cn("min-w-0", className)}>
      <div className="flex items-start gap-2">
        {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "font-semibold leading-snug text-slate-900",
              compact ? "text-sm" : "text-base",
            )}
          >
            {question}
          </h3>
          {allowMultiple || (hasVoted && !ended) ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {allowMultiple ? (
                <Badge variant="neutral" className={badgeSize}>
                  Mehrere Antworten möglich
                </Badge>
              ) : null}
              {hasVoted && !ended ? (
                <Badge variant="success" className={badgeSize}>
                  Abgestimmt
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 pl-1">
          <RunningCountdownBadge
            endsAt={endsAt}
            endedLabel="Umfrage beendet"
            className={countdownSize}
          />
          {showEndDate ? (
            <p className={cn("whitespace-nowrap text-slate-500", endDateSize)}>
              Ende: {endLabel}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
