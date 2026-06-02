"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function formatTT_HH_MM_SS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = Math.floor(s % 60);
  return `${pad2(days)}:${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

export function EventsCountdown({
  nextStartAt,
  nextTitle,
  compact = false,
}: {
  nextStartAt: string | null;
  nextTitle?: string | null;
  compact?: boolean;
}) {
  const target = useMemo(
    () => (nextStartAt ? new Date(nextStartAt).getTime() : null),
    [nextStartAt],
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsLeft =
    target && Number.isFinite(target) ? Math.max(0, Math.floor((target - now) / 1000)) : null;

  const dateLabel =
    nextStartAt && !Number.isNaN(new Date(nextStartAt).getTime())
      ? new Date(nextStartAt).toLocaleString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null;

  if (compact) {
    return (
      <Card className="overflow-hidden border-slate-200">
        <div className="bg-gradient-to-r from-blue-600/10 via-white to-rose-500/10 px-3 py-3">
          <div className="text-xs font-semibold text-slate-600">Nächster Auftritt</div>
          {secondsLeft === null ? (
            <div className="mt-1 text-xs text-slate-600">Kein Termin mit Datum.</div>
          ) : (
            <>
              <div className="mt-1 font-mono text-2xl font-semibold tracking-tight text-slate-900">
                {formatTT_HH_MM_SS(secondsLeft)}
              </div>
              {nextTitle || dateLabel ? (
                <div className="mt-1 truncate text-xs text-slate-700">
                  {dateLabel ? <span className="font-semibold">{dateLabel}</span> : null}
                  {dateLabel && nextTitle ? <span className="text-slate-500"> · </span> : null}
                  {nextTitle ? <span>{nextTitle}</span> : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200">
      <div className="bg-gradient-to-r from-blue-600/10 via-white to-rose-500/10">
        <CardHeader className="pb-1">
          <CardTitle>Countdown zum nächsten Auftritt</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          {secondsLeft === null ? (
            <div className="text-sm text-slate-600">Noch kein Termin mit Datum vorhanden.</div>
          ) : (
            <div className="grid gap-1">
              <div className="flex items-baseline gap-3">
                <div className="font-mono text-4xl font-semibold tracking-tight text-slate-900">
                  {formatTT_HH_MM_SS(secondsLeft)}
                </div>
              </div>
              {nextTitle || dateLabel ? (
                <div className="text-sm text-slate-700">
                  {dateLabel ? <span className="font-semibold">{dateLabel}</span> : null}
                  {dateLabel && nextTitle ? <span className="text-slate-500"> · </span> : null}
                  {nextTitle ? <span className="font-semibold">{nextTitle}</span> : null}
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

