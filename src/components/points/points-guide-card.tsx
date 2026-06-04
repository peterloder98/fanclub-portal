import Link from "next/link";
import { Sparkles, Trophy } from "lucide-react";
import {
  POINTS_RANKS,
  POINTS_YEAR_HINT,
  pointsRulesSortedByPoints,
} from "@/lib/points/catalog";
import {
  MEMBERSHIP_REFERRAL_COMPLETION_POINTS,
} from "@/lib/points/award-membership-referral-completed";
import { MEMBERSHIP_REFERRAL_POINTS } from "@/lib/points/award-membership-referral";

export function PointsGuideCard({ id = "punkte" }: { id?: string }) {
  const rules = pointsRulesSortedByPoints();

  return (
    <div id={id} className="scroll-mt-24 w-full space-y-6">
      <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-600/10 via-white to-rose-500/10 px-5 py-5 shadow-sm shadow-slate-900/5">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Statuspunkte</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{POINTS_YEAR_HINT}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-0.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-rose-500 text-white shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Punkte — Aktionen</h3>
          </div>
          <ul className="grid gap-3">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold leading-snug text-slate-900">{rule.label}</div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{rule.how}</p>
                    {rule.note ? (
                      <p className="mt-1 text-xs text-slate-500">{rule.note}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-3 py-2 text-center shadow-sm">
                    <span className="text-lg font-bold tabular-nums text-white">
                      +{rule.points}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 px-0.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-sm">
              <Trophy className="h-4 w-4" aria-hidden />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Ränge</h3>
          </div>
          <ul className="grid gap-2">
            {POINTS_RANKS.map((r, i) => (
              <li
                key={r.label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm shadow-slate-900/5"
              >
                <span className="font-semibold text-slate-900">{r.label}</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-medium tabular-nums text-slate-700">
                  {r.from === 0 ? "Start" : `ab ${r.from}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50/90 via-white to-blue-50/80 px-5 py-4 text-sm leading-relaxed text-slate-700">
        Tipp: Unter „Empfehlen“ →{" "}
        <Link href="/mitgliedschaft/einladen" className="font-semibold text-blue-700 hover:underline">
          Neues Mitglied werben
        </Link>
        :{" "}
        <span className="font-semibold text-emerald-700">+{MEMBERSHIP_REFERRAL_POINTS} Punkte</span> beim
        Versand, zusätzlich{" "}
        <span className="font-semibold text-emerald-700">+{MEMBERSHIP_REFERRAL_COMPLETION_POINTS} Punkte</span>,
        wenn die Person den Antrag einreicht und freigeschaltet wird.
      </div>
    </div>
  );
}
