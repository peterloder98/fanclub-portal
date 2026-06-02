"use client";

import type { MouseEvent } from "react";

export type PollVoter = { id: string; name: string };

export function PollVoteStats({
  count,
  percent,
  voters,
  loading,
  onMouseEnter,
  onClick,
}: {
  count: number;
  percent: number;
  voters: PollVoter[];
  loading?: boolean;
  onMouseEnter?: (e: MouseEvent<HTMLSpanElement>) => void;
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
}) {
  return (
    <span
      className="group/stats relative shrink-0 rounded-lg px-2 py-1 tabular-nums text-slate-600 hover:bg-white/80"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {count} ({percent}%)
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-[60] mt-1.5 hidden w-56 rounded-xl border bg-white p-3 text-left text-xs text-slate-700 shadow-lg shadow-slate-900/15 group-hover/stats:block"
      >
        <span className="font-semibold text-slate-900">Wer hat gestimmt?</span>
        <span className="mt-2 block max-h-40 overflow-y-auto">
          {loading ? (
            "Lade…"
          ) : voters.length ? (
            voters.slice(0, 12).map((u) => (
              <span key={u.id} className="block truncate py-0.5">
                {u.name}
              </span>
            ))
          ) : (
            "Noch keine Stimmen"
          )}
          {voters.length > 12 ? (
            <span className="mt-1 block text-slate-500">+{voters.length - 12} weitere…</span>
          ) : null}
        </span>
      </span>
    </span>
  );
}
