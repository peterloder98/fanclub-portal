"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ANNI_SPOTIFY_ARTIST_ID } from "@/lib/spotify/constants";

type SpotifyPlayerInstance = {
  connect: () => Promise<boolean>;
  addListener: (event: string, cb: (state: { device_id?: string }) => void) => void;
  disconnect: () => void;
};

declare global {
  interface Window {
    Spotify?: {
      Player: new (opts: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

function loadSpotifySdk() {
  return new Promise<void>((resolve, reject) => {
    if (window.Spotify) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[data-spotify-sdk="true"]');
    if (existing) {
      window.onSpotifyWebPlaybackSDKReady = () => resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.dataset.spotifySdk = "true";
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    script.onerror = () => reject(new Error("Spotify SDK konnte nicht geladen werden."));
    document.body.appendChild(script);
  });
}

export function SpotifyWebPlayer({ displayName }: { displayName: string | null }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const playerRef = useRef<SpotifyPlayerInstance | null>(null);

  const getToken = useCallback(async () => {
    const res = await fetch("/api/spotify/access-token");
    if (!res.ok) throw new Error("Spotify-Sitzung abgelaufen. Bitte erneut verbinden.");
    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) throw new Error("Kein Access-Token.");
    return json.access_token;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await loadSpotifySdk();
        if (cancelled || !window.Spotify) return;
        const token = await getToken();
        const player = new window.Spotify.Player({
          name: "Anni Perka Fanclub",
          getOAuthToken: (cb) => {
            void getToken().then(cb).catch(() => cb(""));
          },
          volume: 0.8,
        });
        player.addListener("ready", ({ device_id }) => {
          if (device_id) deviceIdRef.current = device_id;
          setReady(true);
        });
        player.addListener("not_ready", () => setReady(false));
        await player.connect();
        playerRef.current = player;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Player-Start fehlgeschlagen");
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
    };
  }, [getToken]);

  async function playAnni() {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      const deviceId = deviceIdRef.current;
      if (!deviceId) throw new Error("Spotify-Player noch nicht bereit.");

      const topRes = await fetch(
        `https://api.spotify.com/v1/artists/${ANNI_SPOTIFY_ARTIST_ID}/top-tracks?market=DE`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!topRes.ok) throw new Error("Top-Tracks konnten nicht geladen werden.");
      const topJson = (await topRes.json()) as { tracks?: { uri: string }[] };
      const uri = topJson.tracks?.[0]?.uri;
      if (!uri) throw new Error("Keine Titel gefunden.");

      const playRes = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris: [uri] }),
        },
      );
      if (!playRes.ok && playRes.status !== 204) {
        throw new Error(
          playRes.status === 403
            ? "Spotify Premium wird für Wiedergabe im Browser benötigt."
            : "Wiedergabe fehlgeschlagen.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wiedergabe fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 px-1">
      <p className="text-[10px] leading-snug text-slate-600">
        Verbunden als <span className="font-semibold text-slate-800">{displayName ?? "Spotify"}</span>
        . Dein privater Account — nicht für andere Mitglieder sichtbar.
      </p>
      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void playAnni()}
        className="flex h-9 w-full items-center justify-center rounded-xl bg-[#1DB954] text-xs font-semibold text-white transition hover:bg-[#1ed760] disabled:opacity-50"
      >
        {busy ? "Starte…" : ready ? "▶ Anni Perka abspielen" : "Player verbindet…"}
      </button>
      {error ? <p className="text-[10px] text-rose-700">{error}</p> : null}
      <p className="text-[10px] text-slate-500">
        Premium-Konto nötig. Wiedergabe läuft über dein Spotify, nicht über einen gemeinsamen Fanclub-Account.
      </p>
    </div>
  );
}
