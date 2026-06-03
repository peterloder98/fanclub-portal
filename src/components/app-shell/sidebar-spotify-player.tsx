"use client";

import { useCallback, useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import { ANNI_SPOTIFY_ARTIST_ID } from "@/lib/spotify/constants";
import { SpotifyWebPlayer } from "@/components/app-shell/spotify-web-player";

type Status = {
  configured: boolean;
  connected: boolean;
  displayName: string | null;
};

export function SidebarSpotifyPlayer() {
  const [status, setStatus] = useState<Status | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/spotify/status");
    if (!res.ok) {
      setStatus({ configured: false, connected: false, displayName: null });
      return;
    }
    setStatus((await res.json()) as Status);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function disconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/spotify/disconnect", { method: "POST" });
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

      {!configured ? (
        <p className="px-1 text-[10px] leading-snug text-slate-600">
          Spotify-Anbindung ist noch nicht konfiguriert (SPOTIFY_CLIENT_ID in Vercel).
        </p>
      ) : connected ? (
        <SpotifyWebPlayer displayName={status?.displayName ?? null} />
      ) : (
        <>
          <p className="mb-2 px-1 text-[10px] leading-snug text-slate-600">
            Mit deinem eigenen Spotify-Konto anmelden — jeder Nutzer separat, volle Titel mit Premium.
          </p>
          <a
            href="/api/spotify/login"
            className="mb-2 flex h-9 w-full items-center justify-center rounded-xl bg-[#1DB954] text-xs font-semibold text-white shadow-sm transition hover:bg-[#1ed760]"
          >
            Mit Spotify verbinden
          </a>
          <div className="overflow-hidden rounded-xl border border-blue-200/60 shadow-sm shadow-blue-900/5 ring-1 ring-rose-500/10">
            <iframe
              title="Spotify — Anni Perka (Vorschau)"
              src={`https://open.spotify.com/embed/artist/${ANNI_SPOTIFY_ARTIST_ID}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="block border-0"
            />
          </div>
        </>
      )}
    </div>
  );
}
