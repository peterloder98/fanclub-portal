"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/cn";

function formatRemain(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function LiveSessionCountdown({
  endsAt,
  variant = "member",
  className,
  until = "end",
  onEnded,
}: {
  endsAt: string;
  variant?: "member" | "host";
  className?: string;
  /** Countdown bis Start, Session-Ende oder Nachlauf-Ende. */
  until?: "start" | "end" | "grace";
  /** Einmalig, wenn der Countdown 0 erreicht. */
  onEnded?: () => void;
}) {
  const endMs = new Date(endsAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  const endedFired = useRef(false);

  useEffect(() => {
    if (Number.isNaN(endMs)) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endMs]);

  useEffect(() => {
    endedFired.current = false;
  }, [endsAt, until]);

  useEffect(() => {
    if (Number.isNaN(endMs) || !onEnded || endedFired.current) return;
    if (now < endMs) return;
    endedFired.current = true;
    onEnded();
  }, [endMs, now, onEnded]);

  if (Number.isNaN(endMs)) return null;

  const remain = endMs - now;
  const ended = remain <= 0;
  const urgent = !ended && remain <= 60_000;
  const warn = !ended && remain <= 5 * 60_000;

  const endLabel = new Date(endsAt).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const targetWord =
    until === "start" ? "Start" : until === "grace" ? "Schließung" : "Ende";

  if (variant === "host") {
    return (
      <div
        className={cn(
          "mt-2 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold tabular-nums",
          ended && "bg-white/20 text-white",
          urgent && !ended && "bg-rose-500 text-white animate-pulse",
          warn && !urgent && !ended && "bg-amber-400 text-amber-950",
          !warn && !ended && "bg-white/15 text-white",
          className,
        )}
        role="timer"
        aria-live="polite"
      >
        <Clock className="h-4 w-4 shrink-0" aria-hidden />
        {ended ? (
          <span>
            {until === "grace" ? "Nachlauf beendet" : `${targetWord} erreicht`} ({endLabel})
          </span>
        ) : until === "grace" ? (
          <span>Live-Chat endet in {formatRemain(remain)}</span>
        ) : (
          <span>
            Noch {formatRemain(remain)} · {targetWord} {endLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums shadow-sm",
        ended && "border-slate-300 bg-slate-100 text-slate-700",
        urgent && !ended && "border-rose-300 bg-rose-50 text-rose-800 animate-pulse",
        warn && !urgent && !ended && "border-amber-300 bg-amber-50 text-amber-950",
        !warn && !ended && "border-fc-navy/15 bg-white text-fc-navy",
        className,
      )}
      role="timer"
      aria-live="polite"
    >
      <Clock className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      {ended ? (
        <span>
          {until === "start"
            ? "Startzeit erreicht"
            : until === "grace"
              ? "Die Live-Chat Session ist geschlossen"
              : "Die Session ist zu Ende"}{" "}
          ({endLabel})
        </span>
      ) : until === "grace" ? (
        <span>Die Live-Chat Session endet in {formatRemain(remain)}</span>
      ) : (
        <span>
          Noch {formatRemain(remain)} bis zum {targetWord} ({endLabel})
        </span>
      )}
    </div>
  );
}
