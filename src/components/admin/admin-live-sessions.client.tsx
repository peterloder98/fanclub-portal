"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createLiveSessionAction,
  regenerateLiveHostTokenAction,
  resendLiveSessionInvitesAction,
  setLiveSessionStatusAction,
} from "@/app/(app)/admin/live/actions";
import type { LiveSessionRow, LiveSessionStatus } from "@/lib/live/types";
import {
  LIVE_SESSION_MAX_DURATION_MINUTES,
  liveMemberUrl,
  liveSessionDurationMinutes,
} from "@/lib/live/types";
import { AppDateTimeInput } from "@/components/ui/birthdate-segment-input";
import { AdminLiveSessionQuestions } from "@/components/admin/admin-live-session-questions.client";
import { cn } from "@/lib/cn";
import {
  berlinWallClockToUtcIso,
  formatBerlinDateTime,
  utcIsoToBerlinWallClock,
} from "@/lib/datetime/berlin";

function defaultStarts(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return utcIsoToBerlinWallClock(d.toISOString());
}

function defaultJoin(startsLocal: string): string {
  try {
    const startUtc = berlinWallClockToUtcIso(startsLocal);
    const d = new Date(startUtc);
    d.setMinutes(d.getMinutes() - 10);
    return utcIsoToBerlinWallClock(d.toISOString());
  } catch {
    return startsLocal;
  }
}

const STATUS_LABEL: Record<LiveSessionStatus, string> = {
  scheduled: "Geplant",
  live: "Live",
  ended: "Beendet",
  cancelled: "Abgesagt",
};

export function AdminLiveSessionsPanel({
  sessions,
  openQuestionCountBySessionId,
}: {
  sessions: LiveSessionRow[];
  openQuestionCountBySessionId: Record<string, number>;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("Live mit Anni");
  const [startsAt, setStartsAt] = useState(defaultStarts);
  const [joinOpensAt, setJoinOpensAt] = useState(() => defaultJoin(defaultStarts()));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [freshHostUrl, setFreshHostUrl] = useState<string | null>(null);
  const [hostById, setHostById] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [sendInvites, setSendInvites] = useState(true);
  const [inviteInfo, setInviteInfo] = useState<string | null>(null);

  function onStartsChange(v: string) {
    setStartsAt(v);
    setJoinOpensAt(defaultJoin(v));
  }

  function onDurationChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    if (!digits) {
      setDurationMinutes(0);
      return;
    }
    setDurationMinutes(Math.min(LIVE_SESSION_MAX_DURATION_MINUTES, Number(digits)));
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFreshHostUrl(null);
    setInviteInfo(null);
    startTransition(async () => {
      const result = await createLiveSessionAction({
        title,
        // Wanduhr Europe/Berlin — Server rechnet nach UTC um (nicht Browser-TZ).
        startsAt,
        durationMinutes,
        joinOpensAt,
        sendInvites,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFreshHostUrl(result.hostUrl);
      setHostById((prev) => ({ ...prev, [result.id]: result.hostUrl }));
      if (result.invitesQueued) {
        setInviteInfo(
          "Host-Link an Anni und Mitglieder-Einladungen werden in die E-Mail-Warteschlange gelegt (gedrosselter Versand, ca. alle 3 Minuten). Den Host-Link kannst du zusätzlich kopieren.",
        );
      } else {
        setInviteInfo(
          "Host-Link an Anni wird im Hintergrund versendet. Mitglieder-Einladungen wurden nicht angefordert.",
        );
      }
    });
  }

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function regen(sessionId: string) {
    setError(null);
    startTransition(async () => {
      const result = await regenerateLiveHostTokenAction(sessionId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHostById((prev) => ({ ...prev, [sessionId]: result.hostUrl }));
      setFreshHostUrl(result.hostUrl);
      setInviteInfo(
        "Neuer Host-Link erzeugt und an Anni gemailt. Der alte Link funktioniert nicht mehr.",
      );
    });
  }

  function resendInvites(sessionId: string) {
    setError(null);
    setInviteInfo(null);
    startTransition(async () => {
      const result = await resendLiveSessionInvitesAction(sessionId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInviteInfo(
        `In Warteschlange: ${result.emails} E-Mails` +
          (result.errors ? ` (${result.errors} Fehler)` : "") +
          " — Versand gedrosselt alle ~3 Minuten.",
      );
    });
  }

  function setStatus(sessionId: string, status: LiveSessionStatus) {
    setError(null);
    startTransition(async () => {
      const result = await setLiveSessionStatusAction(sessionId, status);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-8">
      <form
        onSubmit={onCreate}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-base font-semibold text-fc-navy">
          Neuen Live-Chat mit Anni planen
        </h2>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-slate-700">Titel</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            required
            maxLength={120}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <AppDateTimeInput
            label="Beitritt ab"
            value={joinOpensAt}
            onChange={setJoinOpensAt}
            required
          />
          <AppDateTimeInput label="Start" value={startsAt} onChange={onStartsChange} required />
        </div>
        <label className="grid max-w-xs gap-1.5">
          <span className="text-sm font-medium text-slate-700">Dauer</span>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={durationMinutes > 0 ? String(durationMinutes) : ""}
              onChange={(e) => onDurationChange(e.target.value)}
              placeholder="z. B. 45"
              className="h-11 w-full rounded-xl border bg-white py-0 pl-3 pr-12 text-sm tabular-nums outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
              required
              aria-describedby="live-duration-hint"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-slate-500">
              Min.
            </span>
          </div>
        </label>
        <p id="live-duration-hint" className="text-xs text-slate-500">
          Maximal {LIVE_SESSION_MAX_DURATION_MINUTES} Minuten. Nach der Dauer endet der Live-Chat
          automatisch. Beitritt am besten ca. 10 Minuten vor Start.
        </p>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <input
            type="checkbox"
            checked={sendInvites}
            onChange={(e) => setSendInvites(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-fc-navy focus:ring-fc-blue"
          />
          <span className="text-sm text-slate-700">
            Alle Fanclub Mitglieder werden per Email und App-Benachrichtigung darüber informiert und
            eingeladen. Bei Zusage gibt es am Tag zuvor eine Erinnerung.
          </span>
        </label>
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        {inviteInfo ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
            {inviteInfo}
          </div>
        ) : null}
        {freshHostUrl ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <p className="font-semibold">Host-Link für Anni (nur einmal sicher speichern):</p>
            <p className="mt-2 break-all font-mono text-xs">{freshHostUrl}</p>
            <button
              type="button"
              onClick={() => copy(freshHostUrl, "fresh")}
              className="mt-3 h-9 rounded-lg bg-fc-navy px-3 text-xs font-semibold text-white hover:bg-fc-blue"
            >
              {copied === "fresh" ? "Kopiert" : "Link kopieren"}
            </button>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-fit rounded-xl bg-fc-navy px-5 text-sm font-semibold text-white hover:bg-fc-blue disabled:opacity-60"
        >
          {pending ? "Speichere…" : "Live-Chat erstellen"}
        </button>
      </form>

      <section className="grid gap-3">
        <h2 className="text-base font-semibold text-fc-navy">Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-600">
            Aktuell steht noch kein neuer Live-Chat-Termin mit Anni fest. Sobald es soweit ist, werden
            die Mitglieder so schnell wie möglich informiert.
          </p>
        ) : (
          sessions.map((s) => {
            const hostUrl = hostById[s.id];
            const duration = liveSessionDurationMinutes(s.starts_at, s.ends_at);
            const openQuestions = openQuestionCountBySessionId[s.id] ?? 0;
            return (
              <article
                key={s.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-fc-navy">{s.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Start {formatBerlinDateTime(s.starts_at)}
                      {duration > 0 ? ` · ${duration} Min.` : null}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Beitritt ab {formatBerlinDateTime(s.join_opens_at)} · Slug{" "}
                      <code className="rounded bg-slate-100 px-1">{s.slug}</code>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {openQuestions > 0 ? (
                      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                        {openQuestions} Frage{openQuestions === 1 ? "" : "n"} offen
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        s.status === "live" && "bg-rose-100 text-rose-800",
                        s.status === "scheduled" && "bg-amber-100 text-amber-900",
                        s.status === "ended" && "bg-slate-100 text-slate-600",
                        s.status === "cancelled" && "bg-slate-100 text-slate-500",
                      )}
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                  </div>
                </div>

                {s.status !== "cancelled" ? (
                  <div className="mt-4">
                    <AdminLiveSessionQuestions
                      sessionId={s.id}
                      initialCount={openQuestions}
                    />
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/live/${s.slug}`}
                    className="h-9 rounded-lg border bg-white px-3 text-xs font-medium leading-9 text-slate-700 hover:bg-slate-50"
                  >
                    Mitglieder-Link
                  </Link>
                  <button
                    type="button"
                    onClick={() => copy(liveMemberUrl(s.slug), `m-${s.id}`)}
                    className="h-9 rounded-lg border bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {copied === `m-${s.id}` ? "Kopiert" : "Mitglieder-URL kopieren"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => regen(s.id)}
                    className="h-9 rounded-lg border bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Neuen Host-Link erzeugen
                  </button>
                  {s.status !== "ended" && s.status !== "cancelled" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => resendInvites(s.id)}
                      className="h-9 rounded-lg border bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Einladungen erneut senden
                    </button>
                  ) : null}
                  {s.status !== "live" && s.status !== "ended" && s.status !== "cancelled" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setStatus(s.id, "live")}
                      className="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      Als live markieren
                    </button>
                  ) : null}
                  {s.status !== "ended" && s.status !== "cancelled" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setStatus(s.id, "ended")}
                      className="h-9 rounded-lg bg-fc-navy px-3 text-xs font-semibold text-white hover:bg-fc-blue disabled:opacity-60"
                    >
                      Beenden
                    </button>
                  ) : null}
                  {s.status === "scheduled" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setStatus(s.id, "cancelled")}
                      className="h-9 rounded-lg border border-rose-200 px-3 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                    >
                      Absagen
                    </button>
                  ) : null}
                </div>
                {hostUrl ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    <p className="font-semibold">Neuer Host-Link (nicht erneut in der DB lesbar):</p>
                    <p className="mt-1 break-all font-mono">{hostUrl}</p>
                    <button
                      type="button"
                      onClick={() => copy(hostUrl, `h-${s.id}`)}
                      className="mt-2 font-semibold underline"
                    >
                      {copied === `h-${s.id}` ? "Kopiert" : "Kopieren"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
