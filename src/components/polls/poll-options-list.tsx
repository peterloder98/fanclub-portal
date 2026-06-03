"use client";

import { PollVoteStats } from "@/components/polls/poll-vote-stats";
import { pollOptionButtonClass } from "@/components/polls/poll-option-styles";
import { PollOptionProgress, pollPercent } from "@/components/polls/poll-option-progress";
import { cn } from "@/lib/cn";
import type { PollVoter } from "@/components/polls/poll-vote-stats";

type OptionRow = { id: string; poll_id: string; label: string; sort_order: number };

export function PollOptionsList({
  pollId,
  opts,
  counts,
  totalVoteSum,
  ended,
  hasVoted,
  myOptionIds,
  votersByOptionId,
  busyKey,
  onToggleVote,
  onEnsureVoters,
  compact = false,
}: {
  pollId: string;
  opts: OptionRow[];
  counts: Map<string, number>;
  totalVoteSum: number;
  ended: boolean;
  hasVoted: boolean;
  myOptionIds: Set<string>;
  votersByOptionId: Record<string, PollVoter[]>;
  busyKey: string | null;
  onToggleVote: (optionId: string, fromEl: HTMLElement) => void;
  onEnsureVoters: (optionId: string) => void;
  compact?: boolean;
}) {
  const showResults = ended || hasVoted || totalVoteSum > 0;

  return (
    <div className={cn("grid", compact ? "gap-1.5" : "gap-2")}>
      {opts.map((o) => {
        const c = counts.get(o.id) ?? 0;
        const { display: pct, bar: barPct } = pollPercent(c, totalVoteSum);
        const picked = myOptionIds.has(o.id);

        return (
          <button
            key={o.id}
            type="button"
            disabled={ended || busyKey === `${pollId}:${o.id}`}
            onClick={(e) => onToggleVote(o.id, e.currentTarget)}
            className={pollOptionButtonClass(picked, ended)}
          >
            {showResults ? <PollOptionProgress percent={barPct} /> : null}
            <div
              className={cn(
                "relative z-10 grid min-h-[40px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2",
                compact ? "px-2.5 py-2 text-xs" : "px-3 py-2.5 text-sm",
              )}
            >
              <span className="min-w-0 text-left font-medium leading-snug text-slate-800">
                {o.label}
              </span>
              {showResults ? (
                <PollVoteStats
                  count={c}
                  percent={pct}
                  voters={votersByOptionId[o.id] ?? []}
                  isMyVote={picked}
                  reserveMyVoteSlot={hasVoted}
                  compact={compact}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    onEnsureVoters(o.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export type { OptionRow };
