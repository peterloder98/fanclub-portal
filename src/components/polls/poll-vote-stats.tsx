"use client";

import type { MouseEvent } from "react";
import { UserListPopover, type UserListEntry } from "@/components/ui/user-list-popover";

export type PollVoter = UserListEntry;

export function PollVoteStats({
  count,
  percent,
  voters,
  loading,
  onMouseEnter,
  onClick,
}: {
  count: number;
  percent: number;
  voters: PollVoter[];
  loading?: boolean;
  onMouseEnter?: (e: MouseEvent<HTMLSpanElement>) => void;
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
}) {
  return (
    <UserListPopover
      label="Wer hat gestimmt?"
      users={voters}
      loading={loading}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {count} ({percent}%)
    </UserListPopover>
  );
}
