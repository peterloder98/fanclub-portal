"use client";

import { Gift, Mail, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { UserAvatar } from "@/components/ui/user-avatar";
import { GiveawayCelebration } from "@/components/giveaways/giveaway-celebration";
import type { MailSignatureOption } from "@/lib/email/signatures";

export type GiveawayWinnerRow = {
  id: string;
  prizeName: string;
  userName: string;
  avatarUrl: string | null;
  notifiedAt: string | null;
};

export function GiveawayWinnerReveal({
  winners,
  isAdmin,
  signatures,
  signatureId,
  onSignatureChange,
  onNotifyWinner,
  busy,
  celebrate,
}: {
  winners: GiveawayWinnerRow[];
  isAdmin: boolean;
  signatures: MailSignatureOption[];
  signatureId: string;
  onSignatureChange: (id: string) => void;
  onNotifyWinner: (winnerId: string) => void;
  busy: boolean;
  celebrate: boolean;
}) {
  const single = winners.length === 1;

  return (
    <section className="relative overflow-hidden rounded-2xl border-2 border-fc-gold/40 bg-gradient-to-br from-fc-gold-soft via-white to-fc-ice shadow-lg shadow-fc-navy/10 ring-1 ring-fc-navy/5">
      <GiveawayCelebration active={celebrate} />
      <div className="fc-accent-bar" aria-hidden />

      <div className="relative z-10 grid gap-5 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fc-navy text-fc-gold shadow-md shadow-fc-navy/25">
            <Trophy className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-fc-gold">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Ausgelost
            </p>
            <h2 className="mt-0.5 text-lg font-bold leading-snug text-fc-navy sm:text-xl">
              {single ? "Der Gewinner steht fest!" : "Die Gewinner stehen fest!"}
            </h2>
          </div>
        </div>

        <div className={cn("grid gap-3", !single && "sm:grid-cols-2")}>
          {winners.map((w) => (
            <div
              key={w.id}
              className={cn(
                "flex items-center gap-4 rounded-xl border border-fc-sky/25 bg-white/90 p-4 shadow-sm",
                single && "sm:px-5 sm:py-5",
              )}
            >
              <UserAvatar
                name={w.userName}
                avatarUrl={w.avatarUrl}
                className={cn(
                  "shrink-0 ring-2 ring-fc-gold/50",
                  single ? "h-16 w-16 text-base" : "h-12 w-12 text-sm",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-fc-navy sm:text-lg">{w.userName}</p>
                <p className="mt-1 flex items-start gap-1.5 text-sm leading-snug text-fc-blue">
                  <Gift className="mt-0.5 h-4 w-4 shrink-0 text-fc-gold" aria-hidden />
                  <span>{w.prizeName}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {isAdmin ? (
          <div className="grid gap-3 rounded-xl border border-fc-sky/20 bg-fc-ice/60 p-4">
            <p className="text-sm font-semibold text-fc-navy">Gewinner benachrichtigen</p>
            {signatures.length ? (
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                Signatur für die E-Mail
                <select
                  value={signatureId}
                  onChange={(e) => onSignatureChange(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-fc-navy shadow-sm"
                >
                  {signatures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="grid gap-2">
              {winners.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white bg-white px-3 py-2.5 shadow-sm"
                >
                  <span className="text-sm font-medium text-fc-navy">{w.userName}</span>
                  <button
                    type="button"
                    disabled={busy || Boolean(w.notifiedAt)}
                    onClick={() => onNotifyWinner(w.id)}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition",
                      w.notifiedAt
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "bg-fc-navy text-white hover:bg-fc-blue disabled:opacity-50",
                    )}
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                    {w.notifiedAt ? "E-Mail gesendet" : "Per E-Mail benachrichtigen"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
