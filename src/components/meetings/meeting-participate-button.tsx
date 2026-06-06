"use client";

import { useState, useTransition } from "react";
import { toggleMeetingParticipation } from "@/app/(app)/treffen/actions";
import { cn } from "@/lib/cn";

export function MeetingParticipateButton({
  meetingId,
  joined,
  disabled = false,
  className,
}: {
  meetingId: string;
  joined: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await toggleMeetingParticipation(meetingId);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Fehler");
            }
          });
        }}
        className={cn(
          "inline-flex h-11 min-w-[10rem] items-center justify-center rounded-xl px-5 text-sm font-semibold shadow-sm transition disabled:opacity-60",
          joined
            ? "border border-fc-sky/50 bg-white text-fc-navy hover:bg-fc-ice"
            : "bg-fc-navy text-white hover:bg-fc-blue",
        )}
      >
        {pending ? "…" : joined ? "Abmelden" : "Teilnehmen"}
      </button>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
