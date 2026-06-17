"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCountdownVerbose } from "@/lib/countdown/format-countdown";

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
    target && Number.isFinite(target) && target > now
      ? Math.max(0, Math.floor((target - now) / 1000))
      : null;

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
            <div className="mt-1 text-xs text-slate-600">Kein anstehender Termin.</div>
          ) : (
            <>
              <div className="mt-1 text-sm font-semibold leading-snug text-slate-900">
                {formatCountdownVerbose(secondsLeft)}
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
            <div className="text-sm text-slate-600">Kein anstehender Termin.</div>
          ) : (
            <div className="grid gap-1">
              <div className="flex items-baseline gap-3">
                <div className="text-lg font-semibold leading-snug text-slate-900">
                  {formatCountdownVerbose(secondsLeft)}
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

