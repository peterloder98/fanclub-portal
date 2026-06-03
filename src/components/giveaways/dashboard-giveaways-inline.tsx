"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { RunningCountdownBadge } from "@/components/ui/running-countdown-badge";
import { giveawayPhase } from "@/lib/giveaways/status-label";
import type { GiveawayListItem } from "@/components/giveaways/giveaway-board";

export function DashboardGiveawaysInline({ items }: { items: GiveawayListItem[] }) {
  const active = items.filter(
    (g) => giveawayPhase(g.ends_at, g.status, g.isPaused) === "active" || g.isPaused,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-1.5">
          <Gift className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-xs font-semibold text-slate-900">Gewinnspiele</span>
        </div>
        <Link href="/giveaways" className="text-[10px] font-medium text-blue-600 hover:underline">
          alle →
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {active.length ? (
          <ul className="grid gap-1.5">
            {active.map((g) => {
              return (
                <li key={g.id}>
                  <Link
                    href={`/giveaways/${g.id}`}
                    className="block rounded-lg border bg-white px-2 py-1.5 transition hover:border-blue-200 hover:bg-blue-50/30"
                  >
                    <div className="text-xs font-medium leading-snug text-slate-900 line-clamp-2">
                      {g.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <RunningCountdownBadge
                        endsAt={g.ends_at}
                        paused={g.isPaused}
                        className="!px-1.5 !py-0.5 !text-[10px]"
                      />
                      {g.myEntered ? (
                        <span className="text-[10px] font-medium text-emerald-700">dabei</span>
                      ) : null}
                    </div>
                    {g.prizeNames[0] ? (
                      <div className="mt-0.5 truncate text-[10px] text-slate-500">
                        {g.prizeNames.join(" · ")}
                      </div>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[11px] text-slate-600">Keine aktiven Gewinnspiele.</p>
        )}
      </div>
    </div>
  );
}
