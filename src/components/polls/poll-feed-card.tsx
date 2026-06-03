"use client";

import Link from "next/link";
import { PieChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RunningCountdownBadge } from "@/components/ui/running-countdown-badge";
import { PollVoteStats } from "@/components/polls/poll-vote-stats";
import { pollOptionButtonClass } from "@/components/polls/poll-option-styles";
import { PollOptionProgress, pollPercent } from "@/components/polls/poll-option-progress";
import { cn } from "@/lib/cn";

export type PollFeedData = {
  id: string;
  question: string;
  allow_multiple: boolean;
  ends_at: string;
  created_at: string;
  lastActivityAt: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAtLabel: string;
};

type OptionRow = { id: string; poll_id: string; label: string; sort_order: number };
type VoteRow = { poll_id: string; option_id: string; user_id: string; created_at?: string };
type Voter = { id: string; name: string; avatarUrl?: string | null };

export function PollFeedCard({
  poll,
  options,
  votes,
  myOptionIds,
  votersByOptionId,
  busyKey,
  onToggleVote,
  onEnsureVoters,
  compact = false,
}: {
  poll: PollFeedData;
  options: OptionRow[];
  votes: VoteRow[];
  myOptionIds: Set<string>;
  votersByOptionId: Record<string, Voter[]>;
  busyKey: string | null;
  onToggleVote: (optionId: string, fromEl: HTMLElement) => void;
  onEnsureVoters: (optionId: string) => void;
  compact?: boolean;
}) {
  const ended = new Date(poll.ends_at).getTime() < Date.now();
  const hasVoted = myOptionIds.size > 0;
  const total = votes.filter((v) => v.poll_id === poll.id).length;
  const counts = new Map<string, number>();
  votes
    .filter((v) => v.poll_id === poll.id)
    .forEach((v) => counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1));

  const opts = options.filter((o) => o.poll_id === poll.id).sort((a, b) => a.sort_order - b.sort_order);

  if (compact) {
    return (
      <div className="rounded-xl border bg-gradient-to-br from-blue-50/80 via-white to-rose-50/50 p-2.5 shadow-sm shadow-slate-900/5">
        <div className="flex flex-wrap items-start justify-between gap-1.5">
          <div className="flex min-w-0 items-start gap-1.5">
            <PieChart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
            <span className="text-xs font-semibold leading-snug text-slate-900">{poll.question}</span>
          </div>
          <RunningCountdownBadge
            endsAt={poll.ends_at}
            className="!px-1.5 !py-0.5 !text-[10px]"
          />
        </div>
        <div className="mt-1.5 grid gap-1">
          {opts.map((o) => {
            const c = counts.get(o.id) ?? 0;
            const { display: pct, bar: barPct } = pollPercent(c, total);
            const showResults = ended || hasVoted || total > 0;
            return (
              <button
                key={o.id}
                type="button"
                disabled={ended || busyKey === `${poll.id}:${o.id}`}
                onClick={(e) => onToggleVote(o.id, e.currentTarget)}
                className={cn(
                  "group text-left text-xs",
                  pollOptionButtonClass(myOptionIds.has(o.id), ended),
                )}
              >
                {showResults ? <PollOptionProgress percent={barPct} /> : null}
                <div className="relative z-10 flex min-h-[32px] items-center justify-between gap-2 px-2 py-1.5">
                  <span className="font-medium text-slate-800">{o.label}</span>
                  {showResults ? (
                    <PollVoteStats
                      count={c}
                      percent={pct}
                      voters={votersByOptionId[o.id] ?? []}
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
        <Link
          href={`/polls/${poll.id}`}
          className="mt-1.5 inline-block text-[10px] font-medium text-blue-600 hover:underline"
        >
          Details & Kommentare →
        </Link>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <div className="h-6 w-6 overflow-hidden rounded-full border bg-slate-50">
                {poll.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poll.authorAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[9px] font-semibold text-slate-600">
                    {poll.authorName
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join("")}
                  </div>
                )}
              </div>
              <span className="font-medium text-slate-800">{poll.authorName}</span>
              <span>·</span>
              <span>{poll.createdAtLabel}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <PieChart className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              <span className="text-sm font-semibold text-slate-900">{poll.question}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <RunningCountdownBadge endsAt={poll.ends_at} />
            {poll.allow_multiple ? <Badge variant="neutral">Mehrfach</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-1.5 pb-3 pt-0">
        {opts.map((o) => {
          const c = counts.get(o.id) ?? 0;
          const { display: pct, bar: barPct } = pollPercent(c, total);
          const showResults = ended || hasVoted || total > 0;
          const voters = votersByOptionId[o.id] ?? [];
          return (
            <button
              key={o.id}
              type="button"
              disabled={ended || busyKey === `${poll.id}:${o.id}`}
              onClick={(e) => onToggleVote(o.id, e.currentTarget)}
              className={pollOptionButtonClass(myOptionIds.has(o.id), ended)}
            >
              {showResults ? <PollOptionProgress percent={barPct} /> : null}
              <div className="relative z-10 flex min-h-[40px] items-center gap-2 px-2.5 py-2 text-sm">
                <span className="min-w-0 flex-1 font-medium text-slate-800">{o.label}</span>
                {showResults ? (
                  <PollVoteStats
                    count={c}
                    percent={pct}
                    voters={voters}
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
        <Link
          href={`/polls/${poll.id}`}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Kommentare →
        </Link>
      </CardContent>
    </Card>
  );
}

export type { OptionRow, VoteRow, Voter };
