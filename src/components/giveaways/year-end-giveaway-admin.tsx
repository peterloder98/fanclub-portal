"use client";

import { useState } from "react";
import {
  addYearEndGiveawayPrize,
  confirmYearEndGiveawayAction,
  removeYearEndGiveawayPrize,
} from "@/app/(app)/giveaways/actions";
import { CLUB_SIGNATURE_ID, type MailSignatureOption } from "@/lib/email/signatures";
import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import { YEAR_END_TIE_BREAK_SUMMARY } from "@/lib/giveaways/year-end-ranking";

type TopMember = {
  rank: number;
  userId: string;
  points: number;
  activityCount: number;
  name: string;
  membershipNumber: string | null;
  avatarUrl?: string | null;
};

export function YearEndGiveawayAdmin({
  giveawayId,
  pointsYear,
  confirmed,
  prizes,
  topMembers,
  signatures,
}: {
  giveawayId: string;
  pointsYear: number;
  confirmed: boolean;
  prizes: { id: string; name: string }[];
  topMembers: TopMember[];
  signatures: MailSignatureOption[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prizeDraft, setPrizeDraft] = useState("");
  const [signatureId, setSignatureId] = useState(CLUB_SIGNATURE_ID);

  async function onAddPrize() {
    const name = prizeDraft.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      await addYearEndGiveawayPrize(giveawayId, name);
      setPrizeDraft("");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  async function onRemovePrize(prizeId: string) {
    if (!window.confirm("Preis entfernen?")) return;
    setBusy(true);
    setError(null);
    try {
      await removeYearEndGiveawayPrize(prizeId);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  async function onConfirm() {
    if (!prizes.length) {
      setError("Bitte mindestens einen Preis eintragen.");
      return;
    }
    if (
      !window.confirm(
        "Gewinnspiel jetzt bestätigen, auslosen und alle Gewinner per E-Mail benachrichtigen?",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmYearEndGiveawayAction(giveawayId, signatureId || undefined);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/90 via-white to-amber-50/50 p-4 text-sm">
      <div className="font-semibold text-violet-950">Jahresend-Sonderverlosung {pointsYear}</div>
      <p className="mt-1.5 leading-relaxed text-slate-600">
        Genau 10 Mitglieder nach Statuspunkten {pointsYear} — bei Punktgleichstand nach festen
        Kriterien, ohne Zufall. Trag die Preise ein, bestätige — dann Auslosung und E-Mails an die
        Gewinner.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{YEAR_END_TIE_BREAK_SUMMARY}</p>

      <div className="mt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Berechtigte Top-10 (endgültige Reihenfolge)
        </h4>
        <ol className="mt-1.5 space-y-1.5 text-slate-800">
          {topMembers.map((m) => (
            <li key={m.userId} className="flex items-start gap-2">
              <span className="w-5 shrink-0 pt-0.5 text-right text-xs font-bold tabular-nums text-slate-500">
                {m.rank}.
              </span>
              <HoverEnlargeAvatar name={m.name} avatarUrl={m.avatarUrl} size="xs">
                <span>
                  <span className="font-medium">{m.name}</span>
                  {m.membershipNumber ? (
                    <span className="text-slate-500"> · Nr. {m.membershipNumber}</span>
                  ) : null}
                  <span className="tabular-nums text-emerald-700"> · {m.points} Pkt.</span>
                  <span className="text-slate-500"> · {m.activityCount} Aktivitäten</span>
                </span>
              </HoverEnlargeAvatar>
            </li>
          ))}
        </ol>
      </div>

      {!confirmed ? (
        <div className="mt-4 space-y-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preise</h4>
            <ul className="mt-1 space-y-1">
              {prizes.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border bg-white px-2 py-1.5">
                  <span>{p.name}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onRemovePrize(p.id)}
                    className="text-xs font-medium text-rose-700 hover:underline"
                  >
                    Entfernen
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input
                value={prizeDraft}
                onChange={(e) => setPrizeDraft(e.target.value)}
                placeholder="Preis (z. B. Meet & Greet)"
                className="h-9 min-w-0 flex-1 rounded-lg border px-2 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void onAddPrize()}
                className="shrink-0 rounded-lg border bg-white px-3 text-xs font-semibold"
              >
                Hinzufügen
              </button>
            </div>
          </div>

          {signatures.length ? (
            <label className="grid gap-1 text-xs text-slate-700">
              Signatur für Gewinner-E-Mails
              <select
                value={signatureId}
                onChange={(e) => setSignatureId(e.target.value)}
                className="h-9 rounded-lg border bg-white px-2 text-sm"
              >
                {signatures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <button
            type="button"
            disabled={busy || !prizes.length}
            onClick={() => void onConfirm()}
            className="h-11 w-full rounded-xl bg-violet-700 text-sm font-semibold text-white disabled:opacity-50"
          >
            Bestätigen & auslosen
          </button>
        </div>
      ) : (
        <p className="mt-3 font-medium text-emerald-800">Ausgelost und Gewinner benachrichtigt.</p>
      )}

      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
