"use client";

import { useEffect, useState } from "react";
import { LiveKitStage } from "@/components/live/livekit-stage.client";
import { LiveSessionChatPanel } from "@/components/live/live-session-chat.client";
import { LiveMemberQuestions } from "@/components/live/live-member-questions.client";
import { LiveSessionRsvpCard } from "@/components/live/live-session-rsvp.client";
import { LiveSessionCountdown } from "@/components/live/live-session-countdown.client";
import { cn } from "@/lib/cn";

type Tab = "chat" | "fragen";

export function LiveMemberRoom({
  slug,
  title,
  sessionId,
  joinOpen,
  status,
  startsAt,
  endsAt,
  rsvpStatus = null,
  showRsvp = true,
}: {
  slug: string;
  title: string;
  sessionId: string;
  joinOpen: boolean;
  status: string;
  startsAt: string;
  endsAt: string;
  rsvpStatus?: "accepted" | "declined" | null;
  showRsvp?: boolean;
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
    <div className="w-full max-w-full px-3 py-4 sm:px-4 lg:px-6">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
          {status === "live" ? "Live" : "Live-Session"}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-fc-navy sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Start {new Date(startsAt).toLocaleString("de-DE")}
        </p>
        <LiveSessionCountdown endsAt={endsAt} variant="member" />
      </header>

      {showRsvp ? (
        <div className="mb-4">
          <LiveSessionRsvpCard sessionId={sessionId} initialStatus={rsvpStatus} />
        </div>
      ) : null}

      {!joinOpen ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-950">
          Der Raum ist noch nicht geöffnet. Sobald der Beitritt beginnt, kannst du hier zuschauen und
          mitmachen.
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)] xl:items-start">
            <div className="min-w-0">
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

            <div className="hidden h-[min(28rem,55vh)] min-h-[22rem] xl:block">
              <LiveSessionChatPanel sessionId={sessionId} enabled className="h-full" />
            </div>
          </div>

          <div className="xl:hidden">
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
                    tab === id
                      ? "bg-fc-navy text-white"
                      : "border border-fc-navy/15 bg-white text-slate-700",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === "chat" ? (
              <LiveSessionChatPanel sessionId={sessionId} enabled className="h-[22rem]" />
            ) : (
              <LiveMemberQuestions sessionId={sessionId} enabled />
            )}
          </div>

          <div className="hidden xl:block">
            <LiveMemberQuestions sessionId={sessionId} enabled />
          </div>
        </div>
      )}
    </div>
  );
}
