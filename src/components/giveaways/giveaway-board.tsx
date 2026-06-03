"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { giveawayPhase, giveawayPhaseLabel } from "@/lib/giveaways/status-label";
import { GiveawayCountdown } from "@/components/giveaways/giveaway-countdown";
import { GiveawayAdminCreate } from "@/components/giveaways/giveaway-admin-create";

export type GiveawayListItem = {
  id: string;
  title: string;
  description: string | null;
  entry_mode: "simple" | "quiz";
  ends_at: string;
  status: string;
  prizeNames: string[];
  entryCount: number;
  myEntered: boolean;
};

type AdminTab = "active" | "ended" | "create";

export function GiveawayBoard({
  items,
  isAdmin,
}: {
  items: GiveawayListItem[];
  isAdmin: boolean;
}) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as AdminTab) || "active";
  const [tab, setTab] = useState<AdminTab>(
    isAdmin && ["active", "ended", "create"].includes(initialTab) ? initialTab : "active",
  );

  const filtered = useMemo(() => {
    return items.filter((g) => {
      const phase = giveawayPhase(g.ends_at, g.status);
      if (tab === "active") return phase === "active";
      if (tab === "ended") return phase === "ended" || phase === "drawn";
      return true;
    });
  }, [items, tab]);

  return (
    <div className="grid gap-4">
      {isAdmin ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["active", "Aktiv"],
              ["ended", "Beendet / Ausgelost"],
              ["create", "Neu anlegen"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition",
                tab === key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "create" && isAdmin ? <GiveawayAdminCreate /> : null}

      {tab !== "create" ? (
        filtered.length ? (
          <div className="grid gap-3">
            {filtered.map((g) => {
              const phase = giveawayPhase(g.ends_at, g.status);
              return (
                <Link key={g.id} href={`/giveaways/${g.id}`} className="block">
                  <Card className="transition hover:shadow-md">
                    <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-blue-600" />
                          <h3 className="text-sm font-semibold text-slate-900">{g.title}</h3>
                        </div>
                        {g.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-600">{g.description}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-500">
                          {g.prizeNames.join(" · ")} · {g.entryCount} Teilnehmer
                          {g.entry_mode === "quiz" ? " · Quiz" : " · Einfach"}
                        </p>
                        {g.myEntered ? (
                          <p className="mt-1 text-xs font-medium text-emerald-700">Du bist dabei</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Badge variant={phase === "active" ? "brand" : "neutral"}>
                          {giveawayPhaseLabel(phase)}
                        </Badge>
                        {phase === "active" ? (
                          <GiveawayCountdown endsAt={g.ends_at} className="text-right" />
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {tab === "active"
              ? "Keine aktiven Gewinnspiele."
              : "Keine beendeten Gewinnspiele."}
          </div>
        )
      ) : null}
    </div>
  );
}
