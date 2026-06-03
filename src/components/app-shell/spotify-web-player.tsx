"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ANNI_SPOTIFY_ARTIST_ID } from "@/lib/spotify/constants";
import {
  connectSpotifyWebPlaybackPlayer,
  resetSpotifyWebPlaybackPlayer,
} from "@/lib/spotify/web-playback-player";
import type { SpotifyDiagnostics } from "@/components/app-shell/spotify-web-player-types";

export function SpotifyWebPlayer({
  displayName,
  diagnostics,
}: {
  displayName: string | null;
  diagnostics?: SpotifyDiagnostics | null;
}) {
  const [ready, setReady] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const initStarted = useRef(false);

  const getToken = useCallback(async () => {
    const res = await fetch("/api/spotify/access-token", { credentials: "same-origin" });
    const json = (await res.json()) as { access_token?: string; error?: string };
    if (!res.ok) {
      throw new Error(json.error ?? "Spotify-Sitzung abgelaufen. Bitte erneut verbinden.");
    }
    if (!json.access_token) throw new Error("Kein Access-Token.");
    return json.access_token;
  }, []);

  const initPlayer = useCallback(async () => {
    if (diagnostics && !diagnostics.tokenOk && diagnostics.tokenError) {
      setError(diagnostics.tokenError);
      setLoadingPlayer(false);
      return;
    }
    if (diagnostics && !diagnostics.scopeOk) {
      setError(
        'Berechtigung „streaming“ fehlt. „Trennen“ und erneut „Mit Spotify verbinden“ (alle Häkchen setzen).',
      );
      setLoadingPlayer(false);
      return;
    }

    setLoadingPlayer(true);
    setError(null);
    resetSpotifyWebPlaybackPlayer();
    try {
      const deviceId = await connectSpotifyWebPlaybackPlayer(getToken);
      deviceIdRef.current = deviceId;
      setReady(Boolean(deviceId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Player-Start fehlgeschlagen");
      setReady(false);
    } finally {
      setLoadingPlayer(false);
    }
  }, [getToken, diagnostics]);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;
    void initPlayer();
  }, [initPlayer]);

  async function playAnni() {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      const deviceId = deviceIdRef.current ?? window.__fanclubSpotifyDeviceId ?? null;
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
            ? "Wiedergabe verweigert — Premium nötig oder Spotify-App kurz öffnen und Musik starten."
            : `Wiedergabe fehlgeschlagen (${playRes.status}).`,
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
        . Dein privater Account.
      </p>

      {diagnostics?.spotifyEmail ? (
        <p className="text-[10px] leading-snug text-amber-900">
          Development-Modus: E-Mail unter User Management eintragen:{" "}
          <code className="break-all text-[9px]">{diagnostics.spotifyEmail}</code> — oder Extended
          Quota beantragen (Admin).
        </p>
      ) : null}

      {diagnostics?.premium === false ? (
        <p className="text-[10px] text-amber-800">
          Spotify meldet: {diagnostics.product ?? "kein Premium"} — Web-Player braucht Premium
          (auch Familien-Slot).
        </p>
      ) : null}

      <button
        type="button"
        disabled={!ready || busy || loadingPlayer}
        onClick={() => void playAnni()}
        className="flex h-10 w-full items-center justify-center rounded-xl bg-[#1DB954] text-xs font-semibold text-white transition hover:bg-[#1ed760] disabled:opacity-50"
      >
        {busy
          ? "Starte…"
          : loadingPlayer
            ? "Player verbindet…"
            : ready
              ? "▶ Anni Perka abspielen"
              : "Player nicht bereit"}
      </button>

      {error ? (
        <p className="text-[10px] leading-snug text-rose-700">{error}</p>
      ) : null}

      {diagnostics?.product ? (
        <p className="text-[10px] text-slate-500">Konto: {diagnostics.product}</p>
      ) : null}
    </div>
  );
}
