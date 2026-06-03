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
  loading,
  onMouseEnter,
  onClick,
}: {
  count: number;
  percent: number;
  voters: PollVoter[];
  isMyVote?: boolean;
  loading?: boolean;
  onMouseEnter?: (e: MouseEvent<HTMLSpanElement>) => void;
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
}) {
  return (
    <UserListPopover
      label="Wer hat gestimmt?"
      users={voters}
      loading={loading}
      align="end"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        {isMyVote ? (
          <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
            Meine Stimme
          </span>
        ) : null}
        {isMyVote ? <span className="text-slate-300" aria-hidden>·</span> : null}
        <span className={cn(isMyVote && "font-medium text-slate-800")}>
          {stimmenLabel(count)} ({percent}%)
        </span>
      </span>
    </UserListPopover>
  );
}
