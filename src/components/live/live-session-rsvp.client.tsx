"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { setLiveSessionRsvpAction } from "@/app/(app)/live/rsvp-actions";
import { cn } from "@/lib/cn";

export function LiveSessionRsvpCard({
  sessionId,
  initialStatus,
}: {
  sessionId: string;
  initialStatus: "accepted" | "declined" | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(next: "accepted" | "declined") {
    setError(null);
    startTransition(async () => {
      const result = await setLiveSessionRsvpAction(sessionId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStatus(next);
    });
  }

  return (
    <section className="rounded-2xl border border-fc-navy/15 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-fc-navy">Bist du dabei?</h2>
      <p className="mt-1 text-sm text-slate-600">
        Sag kurz zu oder ab. Bei Zusage erinnern wir dich einen Tag vorher per E-Mail.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => choose("accepted")}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold disabled:opacity-60",
            status === "accepted"
              ? "bg-emerald-600 text-white"
              : "border border-fc-navy/15 bg-white text-fc-navy hover:bg-fc-ice",
          )}
        >
          <Check className="h-4 w-4" aria-hidden />
          Zusagen
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => choose("declined")}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold disabled:opacity-60",
            status === "declined"
              ? "bg-slate-700 text-white"
              : "border border-fc-navy/15 bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          <X className="h-4 w-4" aria-hidden />
          Absagen
        </button>
      </div>
      {status === "accepted" ? (
        <p className="mt-2 text-sm text-emerald-700">Du hast zugesagt — danke!</p>
      ) : null}
      {status === "declined" ? (
        <p className="mt-2 text-sm text-slate-600">Du hast abgesagt. Du kannst das jederzeit ändern.</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
