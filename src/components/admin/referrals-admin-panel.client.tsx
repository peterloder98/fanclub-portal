"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  clawbackReferralReviewPointsAction,
  releaseReferralReviewPointsAction,
} from "@/app/(app)/admin/referrals/actions";

type SendRow = {
  id: string;
  recipient_email: string;
  recipient_first_name: string | null;
  recipient_last_name: string | null;
  created_at: string;
  link_opened_at: string | null;
  approved_at: string | null;
  converted_application_id: string | null;
  sender: { first_name: string | null; last_name: string | null; email: string | null } | null;
};

type ConversionRow = {
  id: string;
  approved_at: string;
  stars_awarded: number;
  referrer: { first_name: string | null; last_name: string | null } | null;
  referred: { first_name: string | null; last_name: string | null; email: string | null } | null;
};

export type ReviewRow = {
  id: string;
  status: string;
  reasons: string[];
  referral_send_ids: string[];
  points_transaction_ids: string[];
  triggered_at: string;
  admin_note: string | null;
  referrer: { first_name: string | null; last_name: string | null; email: string | null } | null;
  held_points: number;
};

function nameOf(p: { first_name: string | null; last_name: string | null } | null) {
  if (!p) return "—";
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "—";
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

function sendStatus(s: SendRow) {
  if (s.approved_at || s.converted_application_id) return "Anmeldung/Freigabe";
  if (s.link_opened_at) return "Link geöffnet";
  return "offen";
}

export function ReferralsAdminPanel({
  sends,
  conversions,
  reviews,
}: {
  sends: SendRow[];
  conversions: ConversionRow[];
  reviews: ReviewRow[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") === "pruefung" ? "pruefung" : "uebersicht";
  const [tab, setTab] = useState<"uebersicht" | "pruefung">(initialTab);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  const openReviews = useMemo(() => reviews.filter((r) => r.status === "open"), [reviews]);
  const closedReviews = useMemo(() => reviews.filter((r) => r.status !== "open"), [reviews]);

  const sendsById = useMemo(() => new Map(sends.map((s) => [s.id, s])), [sends]);

  function switchTab(next: "uebersicht" | "pruefung") {
    setTab(next);
    const url = next === "pruefung" ? "/admin/referrals?tab=pruefung" : "/admin/referrals";
    router.replace(url);
  }

  function runAction(kind: "release" | "claw", reviewId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const note = noteById[reviewId];
        if (kind === "release") await releaseReferralReviewPointsAction(reviewId, note);
        else await clawbackReferralReviewPointsAction(reviewId, note);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchTab("uebersicht")}
          className={cn(
            "rounded-xl border px-3 py-2 text-sm font-medium",
            tab === "uebersicht"
              ? "border-fc-navy bg-fc-navy text-white"
              : "border-fc-ice bg-white text-fc-navy hover:bg-fc-ice",
          )}
        >
          Übersicht
        </button>
        <button
          type="button"
          onClick={() => switchTab("pruefung")}
          className={cn(
            "rounded-xl border px-3 py-2 text-sm font-medium",
            tab === "pruefung"
              ? "border-fc-navy bg-fc-navy text-white"
              : "border-fc-ice bg-white text-fc-navy hover:bg-fc-ice",
          )}
        >
          Zur Prüfung
          {openReviews.length ? (
            <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
              {openReviews.length}
            </span>
          ) : null}
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {tab === "pruefung" ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
            <h2 className="text-base font-semibold text-fc-navy">Offene Prüfungen</h2>
            <p className="mt-1 text-sm text-slate-600">
              Stille Admin-Fälle: Versand-Sterne wurden vorläufig gehalten. Das Mitglied sieht keinen
              Hinweis. Bitte freigeben oder zurücknehmen.
            </p>
            {openReviews.length ? (
              <ul className="mt-4 space-y-4">
                {openReviews.map((r) => {
                  const related = (r.referral_send_ids ?? [])
                    .map((id) => sendsById.get(id))
                    .filter(Boolean) as SendRow[];
                  return (
                    <li key={r.id} className="rounded-xl border border-amber-200/80 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-fc-navy">{nameOf(r.referrer)}</p>
                          <p className="text-xs text-slate-500">{r.referrer?.email ?? "—"}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Ausgelöst: {formatWhen(r.triggered_at)} · gehalten: {r.held_points} ★
                          </p>
                        </div>
                      </div>
                      <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
                        {(r.reasons ?? []).map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                      {related.length ? (
                        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-100">
                          <table className="min-w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                <th className="px-2 py-1.5 font-medium">Name</th>
                                <th className="px-2 py-1.5 font-medium">E-Mail</th>
                                <th className="px-2 py-1.5 font-medium">Wann</th>
                                <th className="px-2 py-1.5 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {related.map((s) => (
                                <tr key={s.id} className="border-t border-slate-100">
                                  <td className="px-2 py-1.5">
                                    {[s.recipient_first_name, s.recipient_last_name]
                                      .filter(Boolean)
                                      .join(" ") || "—"}
                                  </td>
                                  <td className="px-2 py-1.5">{s.recipient_email}</td>
                                  <td className="px-2 py-1.5">{formatWhen(s.created_at)}</td>
                                  <td className="px-2 py-1.5">{sendStatus(s)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                      <label className="mt-3 block text-xs font-medium text-slate-600">
                        Notiz (optional)
                        <input
                          type="text"
                          value={noteById[r.id] ?? ""}
                          onChange={(e) =>
                            setNoteById((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm"
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => runAction("release", r.id)}
                          className="h-9 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                        >
                          Punkte freigeben
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => runAction("claw", r.id)}
                          className="h-9 rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Punkte zurücknehmen
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Keine offenen Verdachtsfälle.</p>
            )}
          </section>

          {closedReviews.length ? (
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-fc-navy">Erledigte Prüfungen</h2>
              <ul className="mt-3 divide-y text-sm">
                {closedReviews.slice(0, 30).map((r) => (
                  <li key={r.id} className="py-2">
                    <span className="font-medium text-fc-navy">{nameOf(r.referrer)}</span>
                    <span className="text-slate-500">
                      {" "}
                      · {r.status === "released" ? "freigegeben" : "zurückgenommen"} ·{" "}
                      {formatWhen(r.triggered_at)}
                    </span>
                    {r.admin_note ? (
                      <p className="text-xs text-slate-500">Notiz: {r.admin_note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : (
        <>
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-fc-navy">Versendete Empfehlungen</h2>
            <p className="mt-1 text-sm text-slate-600">
              Wer hat wann wen per E-Mail eingeladen — Mitglieder über „Neues Mitglied werben“ sowie
              Admin-Einladungen zum Antragsformular.
            </p>
            {sends.length ? (
              <ul className="mt-4 divide-y text-sm">
                {sends.map((s) => (
                  <li key={s.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <div className="font-medium text-fc-navy">
                        {nameOf(s.sender)} →{" "}
                        {[s.recipient_first_name, s.recipient_last_name].filter(Boolean).join(" ") ||
                          s.recipient_email}
                      </div>
                      <div className="text-xs text-slate-500">
                        {s.recipient_email} · Gesendet: {formatWhen(s.created_at)}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 sm:text-right">
                      {sendStatus(s)}
                      {s.link_opened_at && !s.approved_at
                        ? ` · Geöffnet: ${formatWhen(s.link_opened_at)}`
                        : null}
                      {s.approved_at ? ` · Freigabe: ${formatWhen(s.approved_at)}` : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Noch keine Empfehlungen erfasst.</p>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-fc-navy">Erfolgreich geworbene Mitglieder</h2>
            {conversions.length ? (
              <ul className="mt-4 divide-y text-sm">
                {conversions.map((c) => (
                  <li key={c.id} className="py-3">
                    <div className="font-medium text-fc-navy">
                      {nameOf(c.referrer)} hat {nameOf(c.referred)} geworben
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.referred?.email} · {formatWhen(c.approved_at)} · +{c.stars_awarded} ★
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Noch keine abgeschlossenen Werbungen in referral_conversions.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
