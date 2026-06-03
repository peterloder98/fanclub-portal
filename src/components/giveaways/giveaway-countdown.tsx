"use client";

import { PollEndCountdown } from "@/components/polls/poll-end-countdown";

export function GiveawayCountdown({
  endsAt,
  className,
}: {
  endsAt: string;
  className?: string;
}) {
  return (
    <PollEndCountdown
      endsAt={endsAt}
      className={className}
      endedLabel="Gewinnspiel beendet"
      runningLabel="Endet in"
    />
  );
}
