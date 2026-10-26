"use client";

import { LiveSessionRsvpCard } from "@/components/live/live-session-rsvp.client";
import { LiveMemberQuestions } from "@/components/live/live-member-questions.client";
import { LiveSessionCountdown } from "@/components/live/live-session-countdown.client";
import { formatBerlinDateTimeLong } from "@/lib/datetime/berlin";

function formatWhen(iso: string) {
  return formatBerlinDateTimeLong(iso);
}

function formatDuration(startsAt: string, endsAt: string) {
  const mins = Math.round(
    (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000,
  );
  if (mins < 60) return `ca. ${mins} Minuten`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `ca. ${h} Std. ${m} Min.` : `ca. ${h} Stunde${h === 1 ? "" : "n"}`;
}

/** Infoseite vor dem Live: Wann/Wie, Zusage, eine Vorab-Frage — ohne Video/Chat. */
export function LiveSessionLobby({
  sessionId,
  title,
  startsAt,
  endsAt,
  joinOpensAt,
  rsvpStatus,
}: {
  sessionId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  joinOpensAt: string;
  rsvpStatus: "accepted" | "declined" | null;
}) {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5 px-3 py-5 sm:px-4">
      <section className="rounded-2xl border border-fc-navy/15 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
          Einladung · Live mit Anni
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-fc-navy">{title}</h2>
        <dl className="mt-4 grid gap-3 text-sm text-slate-700">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wann</dt>
            <dd className="mt-0.5 font-medium text-fc-navy">{formatWhen(startsAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dauer</dt>
            <dd className="mt-0.5">{formatDuration(startsAt, endsAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Raum öffnet
            </dt>
            <dd className="mt-0.5">
              Ab {formatWhen(joinOpensAt)} — dann Video und Chat. Vorher brauchst du das noch nicht.
            </dd>
          </div>
        </dl>
        <LiveSessionCountdown endsAt={startsAt} variant="member" until="start" className="mt-4" />
        <p className="mt-2 text-xs text-slate-500">
          Countdown bis zum Start. Video und Mitglieder-Chat erscheinen erst, wenn der Raum
          geöffnet ist.
        </p>
      </section>

      <section className="rounded-2xl border border-fc-navy/15 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-fc-navy">So läuft’s</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Mit deinen Mitgliedsdaten in der Fanclub-App anmelden (Link allein reicht nicht).</li>
          <li>Hier zusagen oder absagen — bei Zusage erinnern wir dich einen Tag vorher per E-Mail.</li>
          <li>Optional schon jetzt eine Frage an Anni einreichen (nur eine Vorab-Frage).</li>
          <li>
            Am Tag des Live: etwas früher einloggen, diesen Link oder Menü „Live“ öffnen — dann
            siehst du Annis Video und den Chat.
          </li>
        </ol>
      </section>

      <LiveSessionRsvpCard sessionId={sessionId} initialStatus={rsvpStatus} />

      <LiveMemberQuestions sessionId={sessionId} enabled mode="advance" />
    </div>
  );
}
