import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  POINTS_RANKS,
  POINTS_RULES,
  POINTS_YEAR_HINT,
} from "@/lib/points/catalog";
import { MEMBERSHIP_REFERRAL_POINTS } from "@/lib/points/award-membership-referral";

export function PointsGuideCard({ id = "punkte" }: { id?: string }) {
  return (
    <Card id={id} className="max-w-2xl scroll-mt-24">
      <CardHeader>
        <CardTitle>Statuspunkte — Übersicht</CardTitle>
        <p className="text-sm text-slate-600">{POINTS_YEAR_HINT}</p>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Aktion</th>
                <th className="px-3 py-2 text-right">Punkte</th>
              </tr>
            </thead>
            <tbody>
              {POINTS_RULES.map((rule) => (
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

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Ränge</h3>
          <ul className="mt-2 grid gap-1 text-sm text-slate-600">
            {POINTS_RANKS.map((r) => (
              <li key={r.label}>
                <span className="font-medium text-slate-800">{r.label}</span>
                {r.from > 0 ? (
                  <span className="text-slate-500"> — ab {r.from} Punkten</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-slate-600">
          Tipp: In der linken Leiste unter „Empfehlen“ findest du{" "}
          <Link href="/mitgliedschaft/einladen" className="font-medium text-blue-700 hover:underline">
            Neues Mitglied werben
          </Link>{" "}
          — pro neuer Empfänger-Adresse{" "}
          <span className="font-semibold text-emerald-700">+{MEMBERSHIP_REFERRAL_POINTS} Punkte</span>.
        </p>
      </CardContent>
    </Card>
  );
}
