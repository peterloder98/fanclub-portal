"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCountdownVerbose } from "@/lib/countdown/format-countdown";

export { formatCountdownVerbose } from "@/lib/countdown/format-countdown";

/** @deprecated Nutze formatCountdownVerbose – Alias für bestehende Imports */
export function formatCountdown(totalSeconds: number) {
  return formatCountdownVerbose(totalSeconds);
}

export function useCountdown(endsAt: string) {
  const target = useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ended = !Number.isFinite(target) || target <= now;
  const secondsLeft = ended ? 0 : Math.max(0, Math.floor((target - now) / 1000));

  return { ended, secondsLeft, text: formatCountdownVerbose(secondsLeft) };
}
