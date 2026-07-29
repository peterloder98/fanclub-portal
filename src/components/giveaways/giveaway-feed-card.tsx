"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RunningCountdownBadge } from "@/components/ui/running-countdown-badge";
import { giveawayPhase } from "@/lib/giveaways/status-label";

export type GiveawayFeedData = {
  id: string;
  title: string;
  description: string | null;
  ends_at: string;
  created_at: string;
  lastActivityAt: string;
  status: string;
  isPaused: boolean;
  prizeNames: string[];
  myEntered: boolean;
};

export function GiveawayFeedCard({ giveaway }: { giveaway: GiveawayFeedData }) {
  const phase = giveawayPhase(giveaway.ends_at, giveaway.status, giveaway.isPaused);
  const active = phase === "active" || giveaway.isPaused;

  return (
    <Card className="overflow-hidden rounded-xl border-fc-sky/20 bg-gradient-to-br from-white to-fc-ice/30">
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fc-ice text-fc-navy">
            <Gift className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-fc-blue">
              Gewinnspiel
            </p>
            <Link
              href={`/giveaways/${giveaway.id}`}
              className="mt-0.5 block text-sm font-semibold leading-snug text-fc-navy hover:text-fc-blue"
            >
              {giveaway.title}
            </Link>
            {giveaway.prizeNames[0] ? (
              <p className="mt-1 line-clamp-1 text-xs text-slate-600">
                {giveaway.prizeNames.join(" · ")}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RunningCountdownBadge
                endsAt={giveaway.ends_at}
                paused={giveaway.isPaused}
                runningPrefix="Läuft noch"
                className="!w-auto !max-w-none !px-2 !py-0.5 !text-[10px]"
              />
              {giveaway.myEntered ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  Dabei
                </span>
              ) : active ? (
                <Link
                  href={`/giveaways/${giveaway.id}`}
                  className="rounded-full bg-fc-navy px-2.5 py-0.5 text-[10px] font-semibold text-white hover:bg-fc-blue"
                >
                  Mitmachen
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
