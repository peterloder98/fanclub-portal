"use client";

import { useEffect, useMemo, useState } from "react";

export function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

export function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = Math.floor(s % 60);
  return `${pad2(days)}:${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
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

  return { ended, secondsLeft, text: formatCountdown(secondsLeft) };
}
