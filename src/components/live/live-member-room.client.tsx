"use client";

import { useEffect, useState } from "react";
import { LiveKitStage } from "@/components/live/livekit-stage.client";
import { LiveSessionChatPanel } from "@/components/live/live-session-chat.client";
import { LiveMemberQuestions } from "@/components/live/live-member-questions.client";
import { cn } from "@/lib/cn";

type Tab = "chat" | "fragen";

export function LiveMemberRoom({
  slug,
  title,
  sessionId,
  joinOpen,
  status,
  startsAt,
}: {
  slug: string;
  title: string;
  sessionId: string;
  joinOpen: boolean;
  status: string;
  startsAt: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chat");

  useEffect(() => {
    if (!joinOpen) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/live/member-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const data = (await res.json()) as { token?: string; url?: string; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.token || !data.url) {
          setError(data.error ?? "Video-Zugang fehlgeschlagen.");
          return;
        }
        setToken(data.token);
        setUrl(data.url);
      } catch {
        if (!cancelled) setError("Netzwerkfehler beim Video-Zugang.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, joinOpen]);

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
          {status === "live" ? "Live" : "Live-Session"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fc-navy">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Start {new Date(startsAt).toLocaleString("de-DE")}
        </p>
      </header>

      {!joinOpen ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-950">
          Der Raum ist noch nicht geöffnet. Bitte später erneut vorbeischauen.
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:items-stretch">
            <div>
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800">
                  {error}
                </div>
              ) : token && url ? (
                <LiveKitStage token={token} serverUrl={url} mode="viewer" />
              ) : (
                <div className="grid aspect-video place-items-center rounded-2xl bg-slate-900 text-sm text-white/80">
                  Verbinde Video…
                </div>
              )}
            </div>
            <div className="hidden min-h-[320px] lg:block lg:h-full">
              <LiveSessionChatPanel sessionId={sessionId} enabled className="h-full min-h-[420px]" />
            </div>
          </div>

          <div className="lg:hidden">
            <div className="mb-2 flex gap-2">
              {(
                [
                  ["chat", "Chat"],
                  ["fragen", "Fragen"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "h-9 flex-1 rounded-xl text-sm font-semibold",
                    tab === id ? "bg-fc-navy text-white" : "border bg-white text-slate-700",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === "chat" ? (
              <LiveSessionChatPanel sessionId={sessionId} enabled className="h-[360px]" />
            ) : (
              <LiveMemberQuestions sessionId={sessionId} enabled />
            )}
          </div>

          <div className="hidden lg:block">
            <LiveMemberQuestions sessionId={sessionId} enabled />
          </div>
        </>
      )}
    </div>
  );
}
