"use client";

import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";

export type MembersLeaderboardRow = {
  userId: string;
  name: string;
  points: number;
  avatarUrl?: string | null;
};

export function MembersLeaderboard({ rows }: { rows: MembersLeaderboardRow[] }) {
  if (!rows.length) {
    return <li className="px-2 py-4 text-sm text-slate-500">Noch keine Punkte.</li>;
  }

  return (
    <>
      {rows.map((r, i) => (
        <li
          key={r.userId}
          className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-slate-50"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-slate-500">
              {i + 1}.
            </span>
            <HoverEnlargeAvatar name={r.name} avatarUrl={r.avatarUrl} size="xs">
              <span className="truncate text-sm font-medium text-slate-900">{r.name}</span>
            </HoverEnlargeAvatar>
          </span>
          <span className="shrink-0 rounded-lg bg-fc-ice px-2 py-0.5 text-sm font-bold tabular-nums text-blue-800">
            {r.points}
          </span>
        </li>
      ))}
    </>
  );
}
