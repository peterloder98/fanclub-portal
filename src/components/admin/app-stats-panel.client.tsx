"use client";

import Link from "next/link";
import { Activity, ChevronLeft, ChevronRight, MessageCircle, Newspaper, Users } from "lucide-react";
import type { AppStatsSnapshot } from "@/app/(app)/admin/app-stats/actions";
import { cn } from "@/lib/cn";

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

function MonthCurve({ series }: { series: AppStatsSnapshot["monthSeries"] }) {
  const max = Math.max(1, ...series.map((p) => p.activeUsers));
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold text-fc-navy">Aktive Nutzer je Monat</h2>
      <p className="mt-1 text-xs text-slate-500">
        Distinct Mitglieder mit mindestens einem App-Tag im Monat (letzte 12 Monate bis Auswahl).
      </p>
      <div className="mt-5 flex h-44 items-end gap-1.5 sm:gap-2">
        {series.map((p) => {
          const h = Math.round((p.activeUsers / max) * 100);
          return (
            <div key={p.month} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-medium tabular-nums text-slate-600">
                {p.activeUsers}
              </span>
              <div className="flex h-32 w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-fc-navy to-fc-blue transition",
                    p.activeUsers === 0 && "bg-slate-200",
                  )}
                  style={{ height: `${Math.max(p.activeUsers === 0 ? 2 : 8, h)}%` }}
                  title={`${p.label}: ${p.activeUsers}`}
                />
              </div>
              <span className="truncate text-[10px] text-slate-500">
                {p.month.slice(5)}/{p.month.slice(2, 4)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AppStatsPanel({ stats }: { stats: AppStatsSnapshot }) {
  const prev = shiftMonth(stats.monthKey, -1);
  const next = shiftMonth(stats.monthKey, 1);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const canGoNext = stats.monthKey < currentMonth;
  const registeredPct =
    stats.activeMembersTotal > 0
      ? Math.round((stats.appRegisteredTotal / stats.activeMembersTotal) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Monatsauswahl
          </p>
          <p className="text-base font-semibold capitalize text-fc-navy">{stats.monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/app-stats?month=${prev}`}
            className="inline-flex h-9 items-center gap-1 rounded-xl border px-3 text-sm font-medium text-fc-navy hover:bg-fc-ice"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Monat zurück
          </Link>
          {canGoNext ? (
            <Link
              href={`/admin/app-stats?month=${next}`}
              className="inline-flex h-9 items-center gap-1 rounded-xl border px-3 text-sm font-medium text-fc-navy hover:bg-fc-ice"
            >
              Monat vor
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-xl border px-3 text-sm font-medium text-slate-400">
              Monat vor
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          )}
        </div>
      </div>

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
          hint={`${registeredPct} % der aktiven Mitglieder · jemals aktiv`}
        />
        <KpiCard
          icon={Activity}
          label="Aktiv diese Woche"
          value={stats.activeThisWeek}
          hint="Letzte 7 Tage"
        />
        <KpiCard
          icon={Activity}
          label="Aktiv im gewählten Monat"
          value={stats.activeThisMonth}
          hint={stats.monthLabel}
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
          hint="Aktive Mitglieder ohne Heartbeat"
        />
        <KpiCard
          icon={Newspaper}
          label="Beiträge im Monat"
          value={stats.postsThisMonth}
          hint="Veröffentlichte Posts"
        />
        <KpiCard
          icon={MessageCircle}
          label="Chat-Nachrichten"
          value={stats.chatMessagesThisMonth}
          hint="Gruppenchat im Monat"
        />
      </div>

      <MonthCurve series={stats.monthSeries} />

      <div className="rounded-2xl border border-dashed border-fc-navy/20 bg-fc-ice/40 px-4 py-4 text-sm text-slate-700">
        <p className="font-semibold text-fc-navy">Weitere sinnvolle Kennzahlen (später)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
          <li>Retention: Anteil Nutzer, die im Folgemonat wiederkommen</li>
          <li>Median / Durchschnitt aktiver Tage pro Nutzer und Monat</li>
          <li>Neue App-Logins vs. neue Mitgliedschaften im Monat</li>
          <li>Engagement-Mix: Feed-Likes, Kommentare, Umfragen, Shop-Bestellungen</li>
        </ul>
      </div>
    </div>
  );
}
