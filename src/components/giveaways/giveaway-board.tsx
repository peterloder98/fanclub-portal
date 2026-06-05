"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { giveawayPhase, giveawayPhaseLabel } from "@/lib/giveaways/status-label";
import { RunningCountdownBadge } from "@/components/ui/running-countdown-badge";
import { GiveawayAdminCreate } from "@/components/giveaways/giveaway-admin-create";
import { EmptyState } from "@/components/ui/empty-state";

export type GiveawayListItem = {
  id: string;
  title: string;
  description: string | null;
  entry_mode: "simple" | "quiz";
  ends_at: string;
  created_at: string;
  status: string;
  isPaused: boolean;
  prizeNames: string[];
  entryCount: number;
  eligibleCount: number;
  myEntered: boolean;
  /** null = nicht teilgenommen; false = teilgenommen, nicht qualifiziert */
  myEligible: boolean | null;
  isYearEndLottery?: boolean;
  pointsYear?: number | null;
};

type AdminTab = "active" | "ended" | "create";
type GiveawaySort = "newest" | "ends_at";

export function GiveawayBoard({
  items,
  isAdmin,
  yearEndBanner,
}: {
  items: GiveawayListItem[];
  isAdmin: boolean;
  yearEndBanner?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as AdminTab) || "active";
  const [tab, setTab] = useState<AdminTab>(
    isAdmin && ["active", "ended", "create"].includes(initialTab) ? initialTab : "active",
  );
  const [sort, setSort] = useState<GiveawaySort>("newest");

  const filtered = useMemo(() => {
    const list = items.filter((g) => {
      const phase = giveawayPhase(g.ends_at, g.status, g.isPaused);
      if (tab === "active") return phase === "active" || phase === "paused";
      if (tab === "ended") return phase === "ended" || phase === "drawn";
      return true;
    });
    const sorted = [...list];
    if (sort === "newest") {
      sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else {
      sorted.sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime());
    }
    return sorted;
  }, [items, tab, sort]);

  return (
    <div className="grid gap-4">
      {yearEndBanner}
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Sortierung:</span>
          <button
            type="button"
            onClick={() => setSort("newest")}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs font-medium",
              sort === "newest"
                ? "border-slate-900 bg-slate-900 text-white"
                : "bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            Neuestes zuerst
          </button>
          <button
            type="button"
            onClick={() => setSort("ends_at")}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs font-medium",
              sort === "ends_at"
                ? "border-slate-900 bg-slate-900 text-white"
                : "bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            Nach Ablaufzeit
          </button>
        </div>
      ) : null}

      {tab !== "create" ? (
        filtered.length ? (
          <div className="grid gap-3">
            {filtered.map((g) => {
              const phase = giveawayPhase(g.ends_at, g.status, g.isPaused);
              return (
                <Link key={g.id} href={`/giveaways/${g.id}`} className="block">
                  <Card className="transition hover:shadow-md">
                    <CardContent className="p-4">
                      <RunningCountdownBadge
                        endsAt={g.ends_at}
                        paused={g.isPaused}
                        className="mb-2 max-w-full justify-start sm:max-w-[14rem]"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Gift className="h-4 w-4 shrink-0 text-blue-600" />
                        <h3 className="text-sm font-semibold text-slate-900">{g.title}</h3>
                        {g.isYearEndLottery ? (
                          <Badge variant="brand" className="text-[10px]">
                            Sonderverlosung
                          </Badge>
                        ) : null}
                      </div>
                      {g.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600">{g.description}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-500">
                        {g.prizeNames.join(" · ")} ·{" "}
                        {isAdmin
                          ? `${g.entryCount} Teilnahme${g.entryCount === 1 ? "" : "n"}, ${g.eligibleCount} berechtigt`
                          : `${g.entryCount} Teilnehmer`}
                        {g.entry_mode === "quiz" ? " · Quiz" : " · Einfach"}
                      </p>
                      {g.myEntered ? (
                        g.myEligible === false && !g.isYearEndLottery ? (
                          <p className="mt-1 text-xs font-medium text-rose-700">
                            Leider hat es diesmal nicht geklappt
                          </p>
                        ) : (
                          <p className="mt-1 text-xs font-medium text-emerald-700">Du bist dabei</p>
                        )
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState>
            {tab === "active"
              ? "Hier gibt es aktuell noch nichts zu sehen, aber das ändert sich schnell."
              : "Noch keine beendeten Gewinnspiele."}
          </EmptyState>
        )
      ) : null}
    </div>
  );
}
