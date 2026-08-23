"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LiveSessionChatPanel } from "@/components/live/live-session-chat.client";
import { LiveMemberQuestions } from "@/components/live/live-member-questions.client";
import { LiveSessionRsvpCard } from "@/components/live/live-session-rsvp.client";
import { LiveSessionCountdown } from "@/components/live/live-session-countdown.client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { emitPointsGain } from "@/lib/points/events";
import { cn } from "@/lib/cn";
import { formatBerlinDateTime } from "@/lib/datetime/berlin";

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

type Tab = "chat" | "fragen";

function useIsXl() {
  const [isXl, setIsXl] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const apply = () => setIsXl(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return isXl;
}

export function LiveMemberRoom({
  slug,
  title,
  sessionId,
  joinOpen,
  status,
  startsAt,
  endsAt,
  graceEndsAt = null,
  rsvpStatus = null,
  showRsvp = true,
  compactHeader = false,
}: {
  slug: string;
  title: string;
  sessionId: string;
  joinOpen: boolean;
  status: string;
  startsAt: string;
  endsAt: string;
  /** Nachlauf-Ende (Chat noch offen, Video aus). */
  graceEndsAt?: string | null;
  rsvpStatus?: "accepted" | "declined" | null;
  showRsvp?: boolean;
  compactHeader?: boolean;
}) {
  const router = useRouter();
  const isXl = useIsXl();
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [videoReady, setVideoReady] = useState(false);
  const [tokenNonce, setTokenNonce] = useState(0);

  const endsAtMs = new Date(endsAt).getTime();
  const [streamEnded, setStreamEnded] = useState(
    () =>
      status === "ended" ||
      (!Number.isNaN(endsAtMs) && Date.now() >= endsAtMs),
  );
  const [graceDeadline, setGraceDeadline] = useState<string | null>(() => {
    if (graceEndsAt) return graceEndsAt;
    return null;
  });
  const [roomClosed, setRoomClosed] = useState(false);

  const inGrace = streamEnded && Boolean(graceDeadline) && !roomClosed;
  const videoOpen = joinOpen && !streamEnded && !roomClosed;
  const chatOpen = (joinOpen && !roomClosed) || inGrace;

  const applyEnded = useCallback((graceIso: string | null | undefined) => {
    setStreamEnded(true);
    setToken(null);
    setUrl(null);
    setGraceDeadline(
      (prev) => graceIso ?? prev ?? new Date(Date.now() + 10 * 60_000).toISOString(),
    );
  }, []);

  const onGraceEnded = useCallback(() => {
    setRoomClosed(true);
    setToken(null);
    setUrl(null);
    router.replace("/live");
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (graceEndsAt) setGraceDeadline(graceEndsAt);
  }, [graceEndsAt]);

  useEffect(() => {
    if (status === "ended") setStreamEnded(true);
  }, [status]);

  /** Frühzeitiges Host-Ende / Löschen: Realtime + kurzes Polling. */
  useEffect(() => {
    if (roomClosed || !sessionId) return;
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    async function syncStatus() {
      const { data, error: qErr } = await supabase
        .from("live_sessions")
        .select("status,grace_ends_at")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (qErr) return;
      if (!data) {
        onGraceEnded();
        return;
      }
      if (data.status === "cancelled") {
        onGraceEnded();
        return;
      }
      if (data.status === "ended") {
        applyEnded(data.grace_ends_at);
      }
    }

    void syncStatus();
    const pollId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void syncStatus();
    }, 3_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncStatus();
    };
    document.addEventListener("visibilitychange", onVisible);

    const channel = supabase
      .channel(`live-session-lifecycle-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as { status?: string; grace_ends_at?: string | null };
          if (row.status === "cancelled") {
            onGraceEnded();
            return;
          }
          if (row.status === "ended") {
            applyEnded(row.grace_ends_at);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "live_sessions",
          filter: `id=eq.${sessionId}`,
        },
        () => {
          onGraceEnded();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, roomClosed, applyEnded, onGraceEnded]);

  useEffect(() => {
    if (!videoOpen) return;
    const t = window.setTimeout(() => setVideoReady(true), 200);
    return () => window.clearTimeout(t);
  }, [videoOpen]);

  useEffect(() => {
    if (!videoOpen || !videoReady) return;
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
          setToken(null);
          setUrl(null);
          return;
        }
        setError(null);
        setToken(data.token);
        setUrl(data.url);
      } catch {
        if (!cancelled) setError("Netzwerkfehler beim Video-Zugang.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, videoOpen, videoReady, tokenNonce]);

  useEffect(() => {
    if (!videoOpen || !sessionId) return;
    let cancelled = false;
    async function ping() {
      try {
        const res = await fetch("/api/live/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { awarded?: boolean; points?: number };
        if (data.awarded && data.points) emitPointsGain(data.points);
      } catch {
        /* ignore transient */
      }
    }
    void ping();
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void ping();
    }, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [videoOpen, sessionId]);

  function onStreamEnded() {
    applyEnded(null);
  }

  function retryVideoToken() {
    setError(null);
    setToken(null);
    setUrl(null);
    setTokenNonce((n) => n + 1);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 lg:px-6">
      {!compactHeader ? (
        <header className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
            {roomClosed
              ? "Beendet"
              : inGrace
                ? "Nachlauf"
                : status === "live"
                  ? "Live"
                  : "Live-Session"}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-fc-navy sm:text-2xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Start {formatBerlinDateTime(startsAt)}
          </p>
          {inGrace && graceDeadline ? (
            <LiveSessionCountdown
              endsAt={graceDeadline}
              variant="member"
              until="grace"
              onEnded={onGraceEnded}
            />
          ) : (
            <LiveSessionCountdown
              endsAt={endsAt}
              variant="member"
              onEnded={onStreamEnded}
            />
          )}
        </header>
      ) : (
        <div className="mb-4">
          <p className="text-sm text-slate-600">
            Start {formatBerlinDateTime(startsAt)}
            {roomClosed
              ? " · Beendet"
              : inGrace
                ? " · Nachlauf (Anni ist offline)"
                : status === "live"
                  ? " · Live"
                  : null}
          </p>
          {inGrace && graceDeadline ? (
            <LiveSessionCountdown
              endsAt={graceDeadline}
              variant="member"
              until="grace"
              onEnded={onGraceEnded}
            />
          ) : (
            <LiveSessionCountdown
              endsAt={endsAt}
              variant="member"
              onEnded={onStreamEnded}
            />
          )}
        </div>
      )}

      {showRsvp ? (
        <div className="mb-4">
          <LiveSessionRsvpCard sessionId={sessionId} initialStatus={rsvpStatus} />
        </div>
      ) : null}

      {roomClosed ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-700">
          Die Live-Chat Session ist geschlossen. Du wirst zur Übersicht weitergeleitet…
        </div>
      ) : !joinOpen && !inGrace ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-950">
          Der Raum ist noch nicht geöffnet. Sobald der Beitritt beginnt, kannst du hier zuschauen und
          mitmachen.
        </div>
      ) : (
        <div className="grid gap-4">
          {inGrace ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
              Anni hat den Live beendet. Der Chat bleibt noch kurz offen — danach schließt sich die
              Session von allein.
            </div>
          ) : null}

          {isXl ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.9fr)] xl:items-start">
              <div className="min-w-0 space-y-4">
                {inGrace ? null : error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800">
                    <p>{error}</p>
                    <button
                      type="button"
                      onClick={retryVideoToken}
                      className="mt-3 h-10 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue"
                    >
                      Erneut verbinden
                    </button>
                  </div>
                ) : token && url ? (
                  <LiveKitStage token={token} serverUrl={url} mode="viewer" />
                ) : (
                  <div className="grid aspect-video place-items-center rounded-2xl bg-slate-900 text-sm text-white/80">
                    {videoReady ? "Verbinde Video…" : "Bereite Live vor…"}
                  </div>
                )}
                {!inGrace ? <LiveMemberQuestions sessionId={sessionId} enabled /> : null}
              </div>
              <div className="h-[min(28rem,55vh)] min-h-[22rem]">
                <LiveSessionChatPanel sessionId={sessionId} enabled={chatOpen} className="h-full" />
              </div>
            </div>
          ) : (
            <>
              {!inGrace ? (
                <div className="min-w-0">
                  {error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800">
                      <p>{error}</p>
                      <button
                        type="button"
                        onClick={retryVideoToken}
                        className="mt-3 h-10 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue"
                      >
                        Erneut verbinden
                      </button>
                    </div>
                  ) : token && url ? (
                    <LiveKitStage token={token} serverUrl={url} mode="viewer" />
                  ) : (
                    <div className="grid aspect-video place-items-center rounded-2xl bg-slate-900 text-sm text-white/80">
                      {videoReady ? "Verbinde Video…" : "Bereite Live vor…"}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="mb-2 flex gap-2">
                {(
                  [
                    ["chat", "Chat"] as const,
                    ...(!inGrace ? ([["fragen", "Fragen"]] as const) : []),
                  ] as Array<readonly [Tab, string]>
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
              {tab === "chat" || inGrace ? (
                <LiveSessionChatPanel sessionId={sessionId} enabled={chatOpen} className="h-[22rem]" />
              ) : (
                <LiveMemberQuestions sessionId={sessionId} enabled />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
