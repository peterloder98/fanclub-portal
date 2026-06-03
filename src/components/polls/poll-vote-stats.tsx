"use client";

import type { MouseEvent } from "react";
import { UserListPopover, type UserListEntry } from "@/components/ui/user-list-popover";
import { stimmenLabel } from "@/lib/text/plural-de";
import { cn } from "@/lib/cn";

export type PollVoter = UserListEntry;

export function PollVoteStats({
  count,
  percent,
  voters,
  isMyVote = false,
  reserveMyVoteSlot = false,
  compact = false,
  loading,
  onMouseEnter,
  onClick,
}: {
  count: number;
  percent: number;
  voters: PollVoter[];
  isMyVote?: boolean;
  reserveMyVoteSlot?: boolean;
  compact?: boolean;
  loading?: boolean;
  onMouseEnter?: (e: MouseEvent<HTMLSpanElement>) => void;
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
}) {
  const showMyVote = isMyVote;

  const stats = (
    <span
      className={cn(
        "tabular-nums text-slate-600",
        compact ? "text-[10px]" : "text-xs",
        isMyVote && "font-medium text-slate-800",
      )}
    >
      {stimmenLabel(count)} ({percent}%)
    </span>
  );

  const myVoteBadge = showMyVote ? (
    <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
      Meine Stimme
    </span>
  ) : reserveMyVoteSlot && compact ? (
    <span className="h-[18px]" aria-hidden />
  ) : null;

  return (
    <UserListPopover
      label="Wer hat gestimmt?"
      users={voters}
      loading={loading}
      align="end"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <span
        className={cn(
          "inline-flex items-center justify-end gap-1.5 text-right",
          compact ? "min-w-[5.5rem] text-[10px]" : "min-w-[6.5rem] text-xs",
        )}
      >
        {myVoteBadge}
        {stats}
      </span>
    </UserListPopover>
  );
}
