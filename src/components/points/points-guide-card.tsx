import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card id={id} className="max-w-4xl scroll-mt-24">
      <CardHeader>
        <CardTitle>Statuspunkte — Übersicht</CardTitle>
        <p className="text-sm text-slate-600">{POINTS_YEAR_HINT}</p>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Punkte — Aktionen</h3>
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Aktion</th>
                    <th className="px-3 py-2 text-right">Punkte</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-medium text-slate-900">{rule.label}</div>
                        <div className="mt-0.5 text-xs text-slate-600">{rule.how}</div>
                        {rule.note ? (
                          <div className="mt-0.5 text-[11px] text-slate-500">{rule.note}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-right align-top font-semibold tabular-nums text-emerald-700">
                        {rule.points > 0 ? `+${rule.points}` : rule.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Ränge</h3>
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Rang</th>
                    <th className="px-3 py-2 text-right">Ab Punkten</th>
                  </tr>
                </thead>
                <tbody>
                  {POINTS_RANKS.map((r) => (
                    <tr key={r.label} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5 font-medium text-slate-900">{r.label}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                        {r.from}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600">
          Tipp: Unter „Empfehlen“ findest du{" "}
          <Link href="/mitgliedschaft/einladen" className="font-medium text-blue-700 hover:underline">
            Neues Mitglied werben
          </Link>
          :{" "}
          <span className="font-semibold text-emerald-700">+{MEMBERSHIP_REFERRAL_POINTS} Punkte</span>{" "}
          pro neuer Empfänger-Adresse beim Versand, zusätzlich{" "}
          <span className="font-semibold text-emerald-700">
            +{MEMBERSHIP_REFERRAL_COMPLETION_POINTS} Punkte
          </span>{" "}
          wenn die Person den Antrag digital einreicht und später freigeschaltet wird.
        </p>
      </CardContent>
    </Card>
  );
}
