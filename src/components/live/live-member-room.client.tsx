"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Maximize2, Minimize2 } from "lucide-react";
import { LiveSessionChatPanel } from "@/components/live/live-session-chat.client";
import { LiveMemberQuestions } from "@/components/live/live-member-questions.client";
import { LiveSessionRsvpCard } from "@/components/live/live-session-rsvp.client";
import { LiveSessionCountdown } from "@/components/live/live-session-countdown.client";
import { LiveSessionAudience } from "@/components/live/live-session-audience.client";
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
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [videoReady, setVideoReady] = useState(false);
  const [tokenNonce, setTokenNonce] = useState(0);
  const [audienceRefreshNonce, setAudienceRefreshNonce] = useState(0);

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
        setAudienceRefreshNonce((n) => n + 1);
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

  useEffect(() => {
    function onFullscreenChange() {
      const el = stageRef.current;
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(
        document.fullscreenElement === el || doc.webkitFullscreenElement === el,
      );
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, []);

  async function toggleFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => void;
    };
    const elFs = el as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    try {
      if (document.fullscreenElement === el || doc.webkitFullscreenElement === el) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        }
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (elFs.webkitRequestFullscreen) {
        await elFs.webkitRequestFullscreen();
      }
    } catch {
      /* Browser blockiert Vollbild ohne User-Geste — ignorieren */
    }
  }

  const theaterLayout = isXl || isFullscreen;

  function renderVideoStage({ fillContainer = false }: { fillContainer?: boolean } = {}) {
    const content = error ? (
      <div
        className={cn(
          "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800",
          isFullscreen && "border-rose-500/30 bg-rose-950/40 text-rose-100",
        )}
      >
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
      <LiveKitStage
        token={token}
        serverUrl={url}
        mode="viewer"
        fillContainer={fillContainer}
        className={fillContainer ? "min-h-0 flex-1 rounded-xl" : undefined}
      />
    ) : (
      <div
        className={cn(
          "grid place-items-center rounded-2xl bg-slate-900 text-sm text-white/80",
          fillContainer ? "min-h-0 flex-1" : "aspect-video",
        )}
      >
        {videoReady ? "Verbinde Video…" : "Bereite Live vor…"}
      </div>
    );

    return (
      <div className={cn("relative min-w-0", fillContainer && "flex min-h-0 flex-1 flex-col")}>
        {content}
        {!isFullscreen ? (
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
            aria-label="Vollbild"
            title="Vollbild"
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
    );
  }

  function renderCountdown() {
    if (inGrace && graceDeadline) {
      return (
        <LiveSessionCountdown
          endsAt={graceDeadline}
          variant="member"
          until="grace"
          onEnded={onGraceEnded}
          className="mt-0 w-full md:w-auto"
        />
      );
    }
    return (
      <LiveSessionCountdown
        endsAt={endsAt}
        variant="member"
        onEnded={onStreamEnded}
        className="mt-0 w-full md:w-auto"
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 lg:px-6">
      {!compactHeader ? (
        <header className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
            <div className="min-w-0 flex-1">
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
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 md:items-end md:pt-6">
              {renderCountdown()}
              {!roomClosed ? (
                <LiveSessionAudience
                  sessionId={sessionId}
                  enabled={chatOpen}
                  refreshNonce={audienceRefreshNonce}
                />
              ) : null}
            </div>
          </div>
        </header>
      ) : (
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
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
          <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
            {renderCountdown()}
            {!roomClosed ? (
              <LiveSessionAudience
                sessionId={sessionId}
                enabled={chatOpen}
                refreshNonce={audienceRefreshNonce}
              />
            ) : null}
          </div>
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
        <div
          ref={stageRef}
          className={cn(
            "grid gap-4",
            isFullscreen &&
              "flex h-full max-h-full w-full flex-col gap-3 overflow-hidden bg-slate-950 p-3 sm:p-4",
            "[&:fullscreen]:flex [&:fullscreen]:h-full [&:fullscreen]:max-h-full [&:fullscreen]:w-full [&:fullscreen]:flex-col [&:fullscreen]:gap-3 [&:fullscreen]:overflow-hidden [&:fullscreen]:bg-slate-950 [&:fullscreen]:p-3 sm:[&:fullscreen]:p-4",
          )}
        >
          {isFullscreen ? (
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 pb-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{title}</p>
                <p className="truncate text-xs text-white/60">
                  {inGrace ? "Nachlauf · Chat offen" : status === "live" ? "Live" : "Live-Session"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Vollbild beenden"
                title="Vollbild beenden"
              >
                <Minimize2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : null}

          <div className={cn("grid min-h-0 gap-4", isFullscreen && "min-h-0 overflow-hidden")}>
            {inGrace && !isFullscreen ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
                Anni hat den Live beendet. Der Chat bleibt noch kurz offen — danach schließt sich die
                Session von allein.
              </div>
            ) : null}

            {theaterLayout ? (
              <div
                className={cn(
                  "grid min-h-0 gap-4",
                  isFullscreen
                    ? "h-full min-h-0 grid-cols-[minmax(0,1fr)_min(22rem,32vw)] grid-rows-1"
                    : "xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.9fr)] xl:items-start",
                )}
              >
                <div
                  className={cn(
                    "min-w-0",
                    isFullscreen
                      ? "grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3"
                      : "space-y-4",
                  )}
                >
                  {inGrace ? null : renderVideoStage({ fillContainer: isFullscreen })}
                  {!inGrace ? (
                    <div
                      className={cn(
                        isFullscreen && "max-h-[min(14rem,28vh)] min-h-0 overflow-y-auto",
                      )}
                    >
                      <LiveMemberQuestions sessionId={sessionId} enabled />
                    </div>
                  ) : null}
                </div>
                <div
                  className={cn(
                    isFullscreen ? "min-h-0" : "h-[min(28rem,55vh)] min-h-[22rem]",
                  )}
                >
                  <LiveSessionChatPanel
                    sessionId={sessionId}
                    enabled={chatOpen}
                    className={cn("h-full", isFullscreen && "rounded-xl border-white/10 bg-slate-900/80")}
                  />
                </div>
              </div>
            ) : (
              <>
                {!inGrace ? <div className="min-w-0">{renderVideoStage()}</div> : null}
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
        </div>
      )}
    </div>
  );
}
