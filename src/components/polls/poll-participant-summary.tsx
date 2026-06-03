"use client";

import { UserListPopover } from "@/components/ui/user-list-popover";
import { personenTeilgenommen } from "@/lib/text/plural-de";
import type { PollVoter } from "@/components/polls/poll-vote-stats";

export function PollParticipantSummary({
  participantCount,
  participants,
  loading,
  onEnsureParticipants,
  className,
}: {
  participantCount: number;
  participants: PollVoter[];
  loading?: boolean;
  onEnsureParticipants?: () => void;
  className?: string;
}) {
  return (
    <UserListPopover
      label="Wer hat teilgenommen?"
      users={participants}
      loading={loading}
      align="end"
      onMouseEnter={onEnsureParticipants}
      className={className}
    >
      <span className="text-xs font-medium text-slate-600">
        {personenTeilgenommen(participantCount)}
      </span>
    </UserListPopover>
  );
}
