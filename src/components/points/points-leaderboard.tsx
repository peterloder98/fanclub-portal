"use client";

import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import type { YearLeaderboardData } from "@/lib/points/year-leaderboard";

function LeaderboardEntry({
  rank,
  name,
  points,
  avatarUrl,
  highlight,
}: {
  rank: number;
  name: string;
  points: number;
  avatarUrl: string | null;
  highlight: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-slate-50">
      <span className="flex min-w-0 items-center gap-2">
        <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-slate-500">{rank}.</span>
        <HoverEnlargeAvatar name={name} avatarUrl={avatarUrl} size="xs">
          <span
            className={
              highlight
                ? "truncate text-sm font-bold text-slate-900"
                : "truncate text-sm font-medium text-slate-900"
            }
          >
            {name}
          </span>
        </HoverEnlargeAvatar>
      </span>
      <span className="shrink-0 rounded-lg bg-fc-ice px-2 py-0.5 text-sm font-bold tabular-nums text-fc-navy">
        {points}
      </span>
    </li>
  );
}

export function PointsLeaderboard({ data }: { data: YearLeaderboardData }) {
  const { rows, selfRow } = data;

  if (!rows.length && !selfRow) {
    return <p className="px-2 py-4 text-sm text-slate-500">Noch keine Anni-Stars in diesem Jahr.</p>;
  }

  return (
    <>
      {rows.map((r) => (
        <LeaderboardEntry
          key={r.userId}
          rank={r.rank}
          name={r.name}
          points={r.points}
          avatarUrl={r.avatarUrl}
          highlight={r.isSelf}
        />
      ))}
      {selfRow ? (
        <>
          <li className="my-1 border-t border-dashed border-slate-200" aria-hidden />
          <LeaderboardEntry
            rank={selfRow.rank}
            name={selfRow.name}
            points={selfRow.points}
            avatarUrl={selfRow.avatarUrl}
            highlight
          />
        </>
      ) : null}
    </>
  );
}
