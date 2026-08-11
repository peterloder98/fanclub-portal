"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, MessageCircle } from "lucide-react";
import { LiveSessionCountdown } from "@/components/live/live-session-countdown.client";
import { formatChatTime } from "@/lib/chat/types";
import { cn } from "@/lib/cn";

const LiveKitStage = dynamic(
  () =>
    import("@/components/live/livekit-stage.client").then((m) => m.LiveKitStage),
  {
    ssr: false,
    loading: () => (
      <div className="grid aspect-video place-items-center rounded-2xl bg-slate-900 text-sm text-white/80">
        Video wird geladen…
      </div>
    ),
  },
);

type Question = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
};

type ChatMsg = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
};

export function LiveHostRoom({ token }: { token: string }) {
  const [lkToken, setLkToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("Live");
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [graceEndsAt, setGraceEndsAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [streamEnded, setStreamEnded] = useState(false);
  const [ending, setEnding] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/live/host-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as {
          token?: string;
          url?: string;
          title?: string;
          endsAt?: string;
          graceEndsAt?: string | null;
          status?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.token || !data.url) {
          if (data.graceEndsAt) {
            setStreamEnded(true);
            setGraceEndsAt(data.graceEndsAt);
            setTitle(data.title ?? "Live");
            setError(null);
            return;
          }
          setError(data.error ?? "Host-Zugang fehlgeschlagen.");
          return;
        }
        setLkToken(data.token);
        setUrl(data.url);
        if (data.title) setTitle(data.title);
        if (data.endsAt) setEndsAt(data.endsAt);
        if (data.status === "ended") {
          setStreamEnded(true);
          setGraceEndsAt(data.graceEndsAt ?? null);
          setLkToken(null);
          setUrl(null);
        }
      } catch {
        if (!cancelled) setError("Netzwerkfehler.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const refreshFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/live/host-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        questions?: Question[];
        messages?: ChatMsg[];
        status?: string;
        graceEndsAt?: string | null;
      };
      setQuestions(data.questions ?? []);
      setMessages(data.messages ?? []);
      if (data.status === "ended") {
        setStreamEnded(true);
        if (data.graceEndsAt) setGraceEndsAt(data.graceEndsAt);
        setLkToken(null);
        setUrl(null);
      }
      requestAnimationFrame(() => {
        const el = chatRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if ((!lkToken && !streamEnded) || (streamEnded && !graceEndsAt)) return;
    void refreshFeed();
    const id = window.setInterval(() => void refreshFeed(), 2500);
    return () => window.clearInterval(id);
  }, [lkToken, refreshFeed, streamEnded, graceEndsAt]);

  async function dismiss(questionId: string) {
    setDismissing(questionId);
    try {
      await fetch("/api/live/host-dismiss-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, questionId }),
      });
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } finally {
      setDismissing(null);
    }
  }

  async function endEarly() {
    if (
      !window.confirm(
        "Live jetzt beenden? Dein Video geht aus. Der Mitglieder-Chat bleibt noch 10 Minuten offen.",
      )
    ) {
      return;
    }
    setEnding(true);
    try {
      const res = await fetch("/api/live/host-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { graceEndsAt?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Beenden fehlgeschlagen.");
        return;
      }
      setStreamEnded(true);
      setLkToken(null);
      setUrl(null);
      setGraceEndsAt(data.graceEndsAt ?? new Date(Date.now() + 10 * 60_000).toISOString());
    } finally {
      setEnding(false);
    }
  }

  function onPlannedEnd() {
    setStreamEnded(true);
    setLkToken(null);
    setUrl(null);
    setGraceEndsAt((prev) => prev ?? new Date(Date.now() + 10 * 60_000).toISOString());
    void fetch("/api/live/host-end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data: { graceEndsAt?: string }) => {
        if (data.graceEndsAt) setGraceEndsAt(data.graceEndsAt);
      })
      .catch(() => {
        /* client grace fallback already set */
      });
  }

  return (
    <div className="min-h-dvh bg-[color:var(--background)]">
      <header className="border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-4 py-3 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Host</p>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-white/85">
              {streamEnded
                ? "Du bist offline. Der Mitglieder-Chat läuft noch kurz weiter."
                : "Kamera und Mikrofon freigeben — Mitglieder sehen dich im Raum. Falls die Verbindung abbricht: denselben Host-Link einfach erneut öffnen."}
            </p>
            {streamEnded && graceEndsAt ? (
              <LiveSessionCountdown
                endsAt={graceEndsAt}
                variant="host"
                until="grace"
              />
            ) : endsAt ? (
              <LiveSessionCountdown
                endsAt={endsAt}
                variant="host"
                onEnded={onPlannedEnd}
              />
            ) : null}
          </div>
          {!streamEnded ? (
            <button
              type="button"
              disabled={ending}
              onClick={() => void endEarly()}
              className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/25 disabled:opacity-60"
            >
              {ending ? "Beende…" : "Live beenden"}
            </button>
          ) : null}
        </div>
      </header>

      <main className="w-full max-w-full px-3 py-4 sm:px-4 lg:px-6">
        {error && !streamEnded ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800">
            {error}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)] xl:items-start">
              <div className="min-w-0 space-y-4">
                {streamEnded ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-700">
                    Video ist beendet. Mitglieder können noch kurz im Chat schreiben — danach schließt
                    sich die Session automatisch.
                  </div>
                ) : lkToken && url ? (
                  <LiveKitStage token={lkToken} serverUrl={url} mode="host" />
                ) : (
                  <div className="grid aspect-video place-items-center rounded-2xl bg-slate-900 text-sm text-white/80">
                    Verbinde…
                  </div>
                )}

                {!streamEnded ? (
                  <section className="overflow-hidden rounded-2xl border border-fc-navy/15 bg-white shadow-sm">
                    <header className="border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-4 py-2.5 text-white">
                      <p className="text-sm font-semibold tracking-tight">Fragen der Mitglieder</p>
                    </header>
                    <ul className="max-h-[16.5rem] overflow-y-auto overscroll-contain divide-y divide-fc-navy/5">
                      {questions.length === 0 ? (
                        <li className="px-4 py-6 text-sm text-slate-500">Noch keine offenen Fragen.</li>
                      ) : (
                        questions.map((q, i) => (
                          <li
                            key={q.id}
                            className={cn(
                              "flex items-start gap-3 px-3 py-2.5",
                              i % 2 === 0 ? "bg-white" : "bg-fc-ice/70",
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-xs font-semibold text-fc-navy">
                                  {q.authorName}
                                </span>
                                <time
                                  className="shrink-0 text-[10px] tabular-nums text-slate-400"
                                  dateTime={q.createdAt}
                                >
                                  {formatChatTime(q.createdAt)}
                                </time>
                              </div>
                              <p className="mt-0.5 text-[13px] leading-snug text-slate-700">{q.body}</p>
                            </div>
                            <button
                              type="button"
                              disabled={dismissing === q.id}
                              onClick={() => void dismiss(q.id)}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                              title="Abhaken"
                              aria-label="Frage abhaken"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </section>
                ) : null}
              </div>

              <aside className="flex h-[min(28rem,55vh)] min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-fc-navy/15 bg-white shadow-sm">
                <header className="shrink-0 border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-3 py-2.5 text-white">
                  <p className="text-sm font-semibold tracking-tight">Mitglieder-Chat</p>
                  <p className="text-[11px] text-white/80">Nur mitlesen</p>
                </header>
                <div ref={chatRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {messages.length === 0 ? (
                    <div className="grid h-full min-h-[10rem] place-items-center px-4 text-center">
                      <div>
                        <MessageCircle className="mx-auto mb-2 h-7 w-7 text-fc-sky/80" />
                        <p className="text-sm text-slate-500">Noch keine Nachrichten.</p>
                      </div>
                    </div>
                  ) : (
                    <ul className="divide-y divide-fc-navy/5">
                      {messages.map((m, i) => (
                        <li
                          key={m.id}
                          className={cn("px-3 py-2.5", i % 2 === 0 ? "bg-white" : "bg-fc-ice/70")}
                        >
                          <div className="flex items-center gap-1.5">
                            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-fc-navy">
                              {m.authorName}
                            </p>
                            <time
                              className="shrink-0 text-[10px] tabular-nums text-slate-400"
                              dateTime={m.createdAt}
                            >
                              {formatChatTime(m.createdAt)}
                            </time>
                          </div>
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-snug text-slate-700">
                            {m.body}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
