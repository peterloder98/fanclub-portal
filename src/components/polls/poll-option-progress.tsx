"use client";

/** Balkenfüllung exakt nach Anteil (0–100), unabhängig von Auswahl-Ring. */
export function PollOptionProgress({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, Number(percent) || 0));
  const scale = clamped / 100;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[10px] bg-white ring-1 ring-inset ring-slate-200/90"
      aria-hidden
    >
      <div className="absolute inset-0 bg-slate-100/80" />
      <div
        className="absolute inset-y-0 left-0 w-full origin-left bg-fc-sky/45"
        style={{ transform: `scaleX(${scale})` }}
      />
    </div>
  );
}

export function pollPercent(count: number, total: number) {
  if (total <= 0 || count <= 0) return { display: 0, bar: 0 };
  const ratio = count / total;
  return {
    display: Math.round(ratio * 100),
    bar: ratio * 100,
  };
}
