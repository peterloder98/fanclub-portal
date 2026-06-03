"use client";

import Link from "next/link";
import { PieChart } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PollVoter } from "@/components/polls/poll-vote-stats";
import { PollHeaderMeta } from "@/components/polls/poll-header-meta";
import { PollOptionsList } from "@/components/polls/poll-options-list";
import { cn } from "@/lib/cn";
import { useMemo } from "react";

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
  participants = [],
  onEnsureParticipants,
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
  participants?: PollVoter[];
  onEnsureParticipants?: () => void;
  compact?: boolean;
}) {
  const ended = new Date(poll.ends_at).getTime() < Date.now();
  const hasVoted = myOptionIds.size > 0;
  const totalVoteSum = votes.filter((v) => v.poll_id === poll.id).length;
  const counts = new Map<string, number>();
  votes
    .filter((v) => v.poll_id === poll.id)
    .forEach((v) => counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1));

  const opts = options.filter((o) => o.poll_id === poll.id).sort((a, b) => a.sort_order - b.sort_order);

  const participantCount = useMemo(
    () => new Set(votes.filter((v) => v.poll_id === poll.id).map((v) => v.user_id)).size,
    [votes, poll.id],
  );

  const optionsList = (
    <PollOptionsList
      pollId={poll.id}
      opts={opts}
      counts={counts}
      totalVoteSum={totalVoteSum}
      ended={ended}
      hasVoted={hasVoted}
      myOptionIds={myOptionIds}
      votersByOptionId={votersByOptionId}
      busyKey={busyKey}
      onToggleVote={onToggleVote}
      onEnsureVoters={onEnsureVoters}
      compact={compact}
    />
  );

  const footer = (
    <Link
      href={`/polls/${poll.id}`}
      className={cn(
        "inline-flex font-medium text-blue-600 hover:underline",
        compact ? "text-[11px]" : "text-xs",
      )}
    >
      Details & Kommentare →
    </Link>
  );

  if (compact) {
    return (
      <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm shadow-slate-900/5">
        <PollHeaderMeta
          question={poll.question}
          endsAt={poll.ends_at}
          allowMultiple={poll.allow_multiple}
          hasVoted={hasVoted}
          ended={ended}
          compact
          icon={<PieChart className="h-4 w-4" />}
          participantCount={participantCount}
          participants={participants}
          onEnsureParticipants={onEnsureParticipants}
        />
        <div className="mt-3">{optionsList}</div>
        <div className="mt-2.5 border-t border-slate-100 pt-2">{footer}</div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-0 pb-0">
        <div className="flex items-center gap-2 pb-3 text-xs text-slate-600">
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
        <PollHeaderMeta
          question={poll.question}
          endsAt={poll.ends_at}
          allowMultiple={poll.allow_multiple}
          hasVoted={hasVoted}
          ended={ended}
          icon={<PieChart className="h-4 w-4" />}
          participantCount={participantCount}
          participants={participants}
          onEnsureParticipants={onEnsureParticipants}
        />
      </CardHeader>
      <CardContent className="grid gap-3 pb-4 pt-0">
        {optionsList}
        {footer}
      </CardContent>
    </Card>
  );
}

export type { OptionRow, VoteRow, Voter };
