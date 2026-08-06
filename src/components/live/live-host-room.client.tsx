"use client";

import { useCallback, useEffect, useState } from "react";
import { LiveKitStage } from "@/components/live/livekit-stage.client";
import { Check } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [dismissing, setDismissing] = useState<string | null>(null);

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
    } catch {
      /* ignore poll errors */
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
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Host</p>
        <h1 className="text-lg font-semibold text-fc-navy">{title}</h1>
        <p className="text-sm text-slate-600">
          Kamera und Mikrofon freigeben — Mitglieder sehen dich groß im Raum.
        </p>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)]">
        <div className="space-y-4">
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

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-fc-navy">Fragen der Mitglieder</h2>
            <p className="mt-1 text-xs text-slate-500">Älteste zuerst — abhaken, wenn erledigt.</p>
            <ul className="mt-3 space-y-2">
              {questions.length === 0 ? (
                <li className="text-sm text-slate-500">Noch keine offenen Fragen.</li>
              ) : (
                questions.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-500">
                        {q.authorName} ·{" "}
                        {new Date(q.createdAt).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="mt-1 text-sm text-slate-800">{q.body}</p>
                    </div>
                    <button
                      type="button"
                      disabled={dismissing === q.id}
                      onClick={() => void dismiss(q.id)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
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

        <aside className="flex min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-fc-navy">Mitglieder-Chat</h2>
            <p className="text-xs text-slate-500">Nur mitlesen</p>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">Noch keine Nachrichten.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <p className="text-xs font-semibold text-slate-500">{m.authorName}</p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-slate-800">{m.body}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
