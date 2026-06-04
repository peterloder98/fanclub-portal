"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { PollParticipantSummary } from "@/components/polls/poll-participant-summary";
import type { PollVoter } from "@/components/polls/poll-vote-stats";
import { RunningCountdownBadge } from "@/components/ui/running-countdown-badge";
import { personenTeilgenommen } from "@/lib/text/plural-de";
import { cn } from "@/lib/cn";

export function PollHeaderMeta({
  question,
  endsAt,
  allowMultiple,
  hasVoted,
  ended,
  compact = false,
  icon,
  className,
  participantCount,
  participants,
  onEnsureParticipants,
  participantsLoading,
}: {
  question: string;
  endsAt: string;
  allowMultiple: boolean;
  hasVoted: boolean;
  ended?: boolean;
  compact?: boolean;
  icon?: ReactNode;
  className?: string;
  participantCount?: number;
  participants?: PollVoter[];
  onEnsureParticipants?: () => void;
  participantsLoading?: boolean;
}) {
  const showBadges = allowMultiple;
  const showParticipants = participantCount !== undefined;

  return (
    <header
      className={cn(
        "rounded-xl border border-slate-200/70 bg-slate-50/60",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
        className,
      )}
    >
      <div className="flex gap-2.5">
        {icon ? (
          <div
            className={cn(
              "grid shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-600",
              compact ? "h-8 w-8" : "h-9 w-9",
            )}
          >
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "min-w-0 flex-1 font-semibold leading-snug text-slate-900",
                compact ? "text-sm" : "text-base",
              )}
            >
              {question}
            </h3>
            <RunningCountdownBadge
              endsAt={endsAt}
              endedLabel="Beendet"
              runningPrefix="Endet in"
              inline
              className={cn(
                "shrink-0",
                compact ? "!px-1.5 !py-0.5 !text-[10px]" : "!px-2 !py-1 !text-[11px]",
              )}
            />
          </div>

          {(showBadges || showParticipants) && (
            <div
              className={cn(
                "flex flex-wrap items-center gap-x-2 gap-y-1",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              {allowMultiple ? (
                <Badge variant="neutral" className={compact ? "!px-1.5 !py-0 !text-[10px]" : undefined}>
                  Mehrfachauswahl
                </Badge>
              ) : null}
              {showParticipants ? (
                participantCount > 0 || (participants?.length ?? 0) > 0 ? (
                  <PollParticipantSummary
                    participantCount={participantCount}
                    participants={participants ?? []}
                    loading={participantsLoading}
                    onEnsureParticipants={onEnsureParticipants}
                    className={compact ? "!text-[10px]" : undefined}
                  />
                ) : (
                  <span className="text-slate-500">{personenTeilgenommen(0)}</span>
                )
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
