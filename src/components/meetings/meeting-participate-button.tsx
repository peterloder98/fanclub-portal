"use client";

import { useState, useTransition } from "react";
import { toggleMeetingParticipation } from "@/app/(app)/treffen/actions";
import { cn } from "@/lib/cn";
import { useSoftLaunch } from "@/components/app-shell/soft-launch-banner.client";

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
  const softLaunch = useSoftLaunch();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const locked = disabled || !softLaunch.canWrite;

  return (
    <div className={className}>
      <button
        type="button"
        disabled={locked || pending}
        onClick={() => {
          setError(null);
          if (!softLaunch.canWrite) {
            setError(softLaunch.writeBlockedMessage);
            return;
          }
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
      {!softLaunch.canWrite && !error ? (
        <p className="mt-1 text-xs text-amber-800">{softLaunch.writeBlockedMessage}</p>
      ) : null}
    </div>
  );
}
