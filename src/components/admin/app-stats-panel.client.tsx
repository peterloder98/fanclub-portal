"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Newspaper,
  Users,
} from "lucide-react";
import {
  loadAppStats,
  type AppStatsDayPoint,
  type AppStatsMonthPoint,
  type AppStatsSnapshot,
} from "@/app/(app)/admin/app-stats/actions";
import { cn } from "@/lib/cn";

type ChartMode = "users_day" | "hits_day" | "users_month" | "members_month";

const CHART_OPTIONS: { value: ChartMode; label: string }[] = [
  { value: "users_day", label: "User / Monat" },
  { value: "hits_day", label: "App-Zugriffe / Monat" },
  { value: "users_month", label: "Monatsvergleich" },
  { value: "members_month", label: "Gesamtmitglieder" },
];

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-fc-navy">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-fc-ice text-fc-navy">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function StatsBars({
  points,
  dense,
}: {
  points: Array<{ key: string; label: string; value: number; title: string }>;
  dense?: boolean;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div
      className={cn(
        "mt-4 flex h-48 items-end",
        dense ? "gap-px sm:gap-0.5" : "gap-1.5 sm:gap-2",
      )}
    >
      {points.map((p) => {
        const h = Math.round((p.value / max) * 100);
        return (
          <div key={p.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span
              className={cn(
                "font-medium tabular-nums text-slate-600",
                dense ? "text-[9px] sm:text-[10px]" : "text-[10px]",
              )}
            >
              {p.value > 0 ? p.value : ""}
            </span>
            <div className="flex h-36 w-full items-end justify-center">
              <div
                className={cn(
                  "w-full rounded-t-sm bg-gradient-to-t from-fc-navy to-fc-blue",
                  dense ? "max-w-none" : "max-w-[28px] rounded-t-md",
                  p.value === 0 && "bg-slate-200",
                )}
                style={{ height: `${Math.max(p.value === 0 ? 2 : 6, h)}%` }}
                title={p.title}
              />
            </div>
            <span
              className={cn(
                "truncate text-slate-500",
                dense ? "text-[8px] sm:text-[9px]" : "text-[10px]",
              )}
            >
              {p.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function dayPoints(series: AppStatsDayPoint[]) {
  return series.map((p) => ({
    key: p.date,
    label: p.label,
    value: p.value,
    title: `${p.date}: ${p.value}`,
  }));
}

function monthPoints(series: AppStatsMonthPoint[]) {
  return series.map((p) => ({
    key: p.month,
    label: `${p.month.slice(5)}/${p.month.slice(2, 4)}`,
    value: p.value,
    title: `${p.label}: ${p.value}`,
  }));
}

export function AppStatsPanel({ initial }: { initial: AppStatsSnapshot }) {
  const [stats, setStats] = useState(initial);
  const [chart, setChart] = useState<ChartMode>("users_day");
  const [pending, startTransition] = useTransition();
  const curMonth = currentMonthKey();
  const monthNav = chart === "users_day" || chart === "hits_day";

  const registeredPct =
    stats.activeMembersTotal > 0
      ? Math.round((stats.appRegisteredTotal / stats.activeMembersTotal) * 100)
      : 0;

  const chartMeta = useMemo(() => {
    switch (chart) {
      case "users_day":
        return {
          title: "Aktive User je Tag",
          hint: "Distinct Mitglieder mit App-Nutzung an diesem Tag.",
          points: dayPoints(stats.usersPerDay),
          dense: true,
        };
      case "hits_day":
        return {
          title: "App-Zugriffe je Tag",
          hint: "Heartbeats / Seitenbesuche in der App an diesem Tag.",
          points: dayPoints(stats.hitsPerDay),
          dense: true,
        };
      case "users_month":
        return {
          title: "Monatsvergleich (angemeldete User)",
          hint: "Distinct Nutzer mit Login/Aktivität je Monat — 12 Monate bis heute.",
          points: monthPoints(stats.usersPerMonth),
          dense: false,
        };
      case "members_month":
        return {
          title: "Gesamtmitglieder",
          hint: "Fanclub-Mitglieder zum jeweiligen Monatsende — 12 Monate bis heute.",
          points: monthPoints(stats.membersPerMonth),
          dense: false,
        };
    }
  }, [chart, stats]);

  function changeMonth(delta: number) {
    const next = shiftMonth(stats.monthKey, delta);
    if (next > curMonth) return;
    startTransition(async () => {
      const fresh = await loadAppStats(next);
      setStats(fresh);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Aktive Mitglieder"
          value={stats.activeMembersTotal}
          hint="Status aktiv gesamt"
        />
        <KpiCard
          icon={Activity}
          label="In der App registriert"
          value={stats.appRegisteredTotal}
          hint={`${registeredPct} % · jemals aktiv`}
        />
        <KpiCard
          icon={Activity}
          label="Aktiv diese Woche"
          value={stats.activeThisWeek}
          hint="Letzte 7 Tage"
        />
        <KpiCard
          icon={Activity}
          label="Aktiv diesen Monat"
          value={stats.activeThisMonth}
          hint="Laufender Kalendermonat"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Activity}
          label="Aktiv gestern"
          value={stats.activeYesterday}
          hint="Distinct Nutzer"
        />
        <KpiCard
          icon={Users}
          label="Noch nie in der App"
          value={stats.neverLoggedIn}
          hint="Aktive Mitglieder ohne Login"
        />
        <KpiCard
          icon={Newspaper}
          label="Beiträge diesen Monat"
          value={stats.postsThisMonth}
          hint="Veröffentlichte Posts"
        />
        <KpiCard
          icon={MessageCircle}
          label="Chat-Nachrichten"
          value={stats.chatMessagesThisMonth}
          hint="Gruppenchat diesen Monat"
        />
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fc-navy">{chartMeta.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{chartMeta.hint}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="shrink-0">Anzeige</span>
            <select
              value={chart}
              onChange={(e) => setChart(e.target.value as ChartMode)}
              className="h-9 rounded-xl border bg-white px-3 text-sm font-medium text-fc-navy outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            >
              {CHART_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {monthNav ? (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => changeMonth(-1)}
              className="grid h-9 w-9 place-items-center rounded-xl border text-fc-navy hover:bg-fc-ice disabled:opacity-50"
              aria-label="Monat zurück"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-[10rem] text-center text-sm font-semibold capitalize text-fc-navy">
              {stats.monthLabel}
            </p>
            <button
              type="button"
              disabled={pending || stats.monthKey >= curMonth}
              onClick={() => changeMonth(1)}
              className="grid h-9 w-9 place-items-center rounded-xl border text-fc-navy hover:bg-fc-ice disabled:opacity-40"
              aria-label="Monat vor"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className={cn(pending && "opacity-60")}>
          <StatsBars points={chartMeta.points} dense={chartMeta.dense} />
        </div>
      </div>
    </div>
  );
}
