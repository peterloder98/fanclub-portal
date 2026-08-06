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
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [dismissing, setDismissing] = useState<string | null>(null);
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
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.token || !data.url) {
          setError(data.error ?? "Host-Zugang fehlgeschlagen.");
          return;
        }
        setLkToken(data.token);
        setUrl(data.url);
        if (data.title) setTitle(data.title);
        if (data.endsAt) setEndsAt(data.endsAt);
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
      };
      setQuestions(data.questions ?? []);
      setMessages(data.messages ?? []);
      requestAnimationFrame(() => {
        const el = chatRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (!lkToken) return;
    void refreshFeed();
    const id = window.setInterval(() => void refreshFeed(), 2500);
    return () => window.clearInterval(id);
  }, [lkToken, refreshFeed]);

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

  return (
    <div className="min-h-dvh bg-[color:var(--background)]">
      <header className="border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-4 py-3 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Host</p>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-white/85">
          Kamera und Mikrofon freigeben — Mitglieder sehen dich im Raum. Falls die Verbindung
          abbricht: denselben Host-Link einfach erneut öffnen.
        </p>
        {endsAt ? <LiveSessionCountdown endsAt={endsAt} variant="host" /> : null}
      </header>

      <main className="w-full max-w-full px-3 py-4 sm:px-4 lg:px-6">
        <div className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)] xl:items-start">
            <div className="min-w-0 space-y-4">
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800">
                  {error}
                </div>
              ) : lkToken && url ? (
                <LiveKitStage token={lkToken} serverUrl={url} mode="host" />
              ) : (
                <div className="grid aspect-video place-items-center rounded-2xl bg-slate-900 text-sm text-white/80">
                  Verbinde…
                </div>
              )}

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
      </main>
    </div>
  );
}
