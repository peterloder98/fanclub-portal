"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music2 } from "lucide-react";
import { SpotifyEmbedPlayer } from "@/components/app-shell/spotify-embed-player";
import { SpotifyWebPlayer } from "@/components/app-shell/spotify-web-player";
import {
  isSpotifyOAuthMessage,
  openSpotifyConnectPopup,
} from "@/lib/spotify/open-connect-popup";
import type { SpotifyDiagnostics } from "@/components/app-shell/spotify-web-player-types";
import { resetSpotifyWebPlaybackPlayer } from "@/lib/spotify/web-playback-player";

type Status = {
  configured: boolean;
  connected: boolean;
  displayName: string | null;
  diagnostics?: SpotifyDiagnostics | null;
};

export function SidebarSpotifyPlayer() {
  const [status, setStatus] = useState<Status | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showPremiumConnect, setShowPremiumConnect] = useState(false);
  const popupPollRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/status", { credentials: "same-origin" });
      const data = (await res.json()) as Status & { migrationHint?: string };
      if (!res.ok) {
        setStatus({ configured: false, connected: false, displayName: null });
        return;
      }
      setStatus({
        configured: Boolean(data.configured),
        connected: Boolean(data.connected),
        displayName: data.displayName ?? null,
        diagnostics: (data as Status).diagnostics ?? null,
      });
    } catch {
      setStatus({ configured: false, connected: false, displayName: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      if (popupPollRef.current) window.clearInterval(popupPollRef.current);
    };
  }, [refresh]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isSpotifyOAuthMessage(event.data)) return;
      setConnecting(false);
      void refresh();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refresh]);

  function connectSpotify() {
    setConnecting(true);
    const popup = openSpotifyConnectPopup();
    if (!popup) {
      setConnecting(false);
      window.location.href = "/api/spotify/login";
      return;
    }
    if (popupPollRef.current) window.clearInterval(popupPollRef.current);
    popupPollRef.current = window.setInterval(() => {
      if (popup.closed) {
        if (popupPollRef.current) window.clearInterval(popupPollRef.current);
        popupPollRef.current = null;
        setConnecting(false);
        void refresh();
      }
    }, 500);
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/spotify/disconnect", { method: "POST" });
      resetSpotifyWebPlaybackPlayer();
      await refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  const configured = status?.configured ?? false;
  const connected = status?.connected ?? false;

  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-gradient-to-br from-blue-600/10 via-white to-rose-500/10 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <Music2 className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-[11px] font-semibold text-slate-800">Anni Perka</span>
        </div>
        {connected ? (
          <button
            type="button"
            disabled={disconnecting}
            onClick={() => void disconnect()}
            className="text-[10px] font-medium text-slate-500 hover:text-slate-800"
          >
            Trennen
          </button>
        ) : null}
      </div>

      <p className="mb-2 px-1 text-[10px] leading-snug text-slate-600">
        <strong>Zum Hören:</strong> Embed-Player (oben) — bei Premium/Familie im Browser bei{" "}
        <a
          href="https://open.spotify.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline"
        >
          Spotify
        </a>{" "}
        einloggen, dann volle Songs. Verbinden unten nur für optionalen In-App-Player.
      </p>

      <SpotifyEmbedPlayer />

      {!configured ? (
        <p className="mt-2 px-1 text-[10px] leading-snug text-slate-600">
          Optional: SPOTIFY_CLIENT_ID/SECRET in Vercel für „Premium im Portal“.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {connected ? (
            <SpotifyWebPlayer
              displayName={status?.displayName ?? null}
              diagnostics={status?.diagnostics ?? null}
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowPremiumConnect((v) => !v)}
                className="w-full text-left text-[10px] font-medium text-blue-700 hover:underline"
              >
                {showPremiumConnect ? "▲" : "▼"} Premium: volle Wiedergabe im Portal
              </button>
              {showPremiumConnect ? (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white/80 p-2">
                  <p className="text-[10px] leading-snug text-slate-600">
                    Free-Konten: bei Spotify nur ~30 Sek. Vorschau — das ist eine Spotify-Regel, nicht
                    von uns begrenzt. Volle Songs nur mit Premium.
                  </p>
                  <p className="text-[10px] leading-snug text-amber-800">
                    Developer-Modus: Jede Spotify-E-Mail muss im{" "}
                    <a
                      href="https://developer.spotify.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Spotify Dashboard
                    </a>{" "}
                    unter User Management eingetragen werden (max. 25). Kommt nicht automatisch beim
                    Login. Für alle Mitglieder später „Extended Quota“ beantragen.
                  </p>
                  <button
                    type="button"
                    disabled={connecting}
                    onClick={() => connectSpotify()}
                    className="flex h-9 w-full items-center justify-center rounded-xl bg-[#1DB954] text-xs font-semibold text-white shadow-sm transition hover:bg-[#1ed760] disabled:opacity-60"
                  >
                    {connecting ? "Spotify-Fenster …" : "Mit Spotify verbinden"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
