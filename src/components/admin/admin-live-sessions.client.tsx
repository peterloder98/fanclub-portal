"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createLiveSessionAction,
  regenerateLiveHostTokenAction,
  setLiveSessionStatusAction,
} from "@/app/(app)/admin/live/actions";
import type { LiveSessionRow, LiveSessionStatus } from "@/lib/live/types";
import { liveMemberUrl } from "@/lib/live/types";
import { cn } from "@/lib/cn";

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultStarts(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return toLocalInputValue(d.toISOString());
}

function defaultJoin(startsLocal: string): string {
  const d = new Date(startsLocal);
  d.setMinutes(d.getMinutes() - 10);
  return toLocalInputValue(d.toISOString());
}

function defaultEnds(startsLocal: string): string {
  const d = new Date(startsLocal);
  d.setHours(d.getHours() + 1);
  return toLocalInputValue(d.toISOString());
}

const STATUS_LABEL: Record<LiveSessionStatus, string> = {
  scheduled: "Geplant",
  live: "Live",
  ended: "Beendet",
  cancelled: "Abgesagt",
};

export function AdminLiveSessionsPanel({
  sessions,
}: {
  sessions: LiveSessionRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("Live mit Anni");
  const [startsAt, setStartsAt] = useState(defaultStarts);
  const [joinOpensAt, setJoinOpensAt] = useState(() => defaultJoin(defaultStarts()));
  const [endsAt, setEndsAt] = useState(() => defaultEnds(defaultStarts()));
  const [error, setError] = useState<string | null>(null);
  const [freshHostUrl, setFreshHostUrl] = useState<string | null>(null);
  const [hostById, setHostById] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  function onStartsChange(v: string) {
    setStartsAt(v);
    setJoinOpensAt(defaultJoin(v));
    setEndsAt(defaultEnds(v));
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFreshHostUrl(null);
    startTransition(async () => {
      const result = await createLiveSessionAction({
        title,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        joinOpensAt: new Date(joinOpensAt).toISOString(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFreshHostUrl(result.hostUrl);
      setHostById((prev) => ({ ...prev, [result.id]: result.hostUrl }));
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
        <h2 className="text-base font-semibold text-fc-navy">Neue Live-Session</h2>
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
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">Beitritt ab</span>
            <input
              type="datetime-local"
              value={joinOpensAt}
              onChange={(e) => setJoinOpensAt(e.target.value)}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
              required
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">Start</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => onStartsChange(e.target.value)}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
              required
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">Ende</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
              required
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Tipp: Beitritt ca. 10 Minuten vor Start, damit Mitglieder und Anni früh reinkommen
          können.
        </p>
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
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
          {pending ? "Speichere…" : "Session anlegen"}
        </button>
      </form>

      <section className="grid gap-3">
        <h2 className="text-base font-semibold text-fc-navy">Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Sessions.</p>
        ) : (
          sessions.map((s) => {
            const hostUrl = hostById[s.id];
            return (
              <article
                key={s.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-fc-navy">{s.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(s.starts_at).toLocaleString("de-DE")} –{" "}
                      {new Date(s.ends_at).toLocaleString("de-DE")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Beitritt ab {new Date(s.join_opens_at).toLocaleString("de-DE")} · Slug{" "}
                      <code className="rounded bg-slate-100 px-1">{s.slug}</code>
                    </p>
                  </div>
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
