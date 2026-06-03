"use client";

import { useCallback, useRef, useState } from "react";
import { ANNI_SPOTIFY_ARTIST_ID } from "@/lib/spotify/constants";
import {
  connectSpotifyWebPlaybackPlayer,
  resetSpotifyWebPlaybackPlayer,
} from "@/lib/spotify/web-playback-player";
import type { SpotifyDiagnostics } from "@/components/app-shell/spotify-web-player-types";

const SPOTIFY_ARTIST_URL = `https://open.spotify.com/artist/${ANNI_SPOTIFY_ARTIST_ID}`;

export function SpotifyWebPlayer({
  displayName,
  diagnostics,
}: {
  displayName: string | null;
  diagnostics?: SpotifyDiagnostics | null;
}) {
  const [playerStarted, setPlayerStarted] = useState(false);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  const getToken = useCallback(async () => {
    const res = await fetch("/api/spotify/access-token", { credentials: "same-origin" });
    const json = (await res.json()) as { access_token?: string; error?: string };
    if (!res.ok) {
      throw new Error(json.error ?? "Spotify-Sitzung abgelaufen. Bitte erneut verbinden.");
    }
    if (!json.access_token) throw new Error("Kein Access-Token.");
    return json.access_token;
  }, []);

  const preflightError = (() => {
    if (!diagnostics) return null;
    if (!diagnostics.tokenOk && diagnostics.tokenError) return diagnostics.tokenError;
    if (!diagnostics.scopeOk) {
      return 'Berechtigung „streaming“ fehlt. „Trennen“ → erneut verbinden und alle Häkchen bei Spotify setzen.';
    }
    if (diagnostics.premium === false) {
      return `Spotify meldet „${diagnostics.product ?? "kein Premium"}“. Für den In-App-Player brauchst du ein Premium-Profil (auch Familien-Mitglied mit Premium-Slot). Sonst den Player oben im Embed nutzen.`;
    }
    return null;
  })();

  async function startInAppPlayer() {
    if (preflightError) {
      setError(preflightError);
      return;
    }
    setLoadingPlayer(true);
    setError(null);
    setPlayerStarted(true);
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
  }

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
            ? "Wiedergabe verweigert. Spotify-App auf dem Handy öffnen, kurz Musik starten, dann hier erneut „Abspielen“."
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
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white/80 p-2">
      <p className="text-[10px] leading-snug text-slate-600">
        Verbunden als <span className="font-semibold text-slate-800">{displayName ?? "Spotify"}</span>
      </p>

      {diagnostics?.spotifyEmail ? (
        <p className="text-[10px] leading-snug text-amber-900">
          Developer-Modus: Diese E-Mail im{" "}
          <a
            href="https://developer.spotify.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            Spotify Dashboard
          </a>{" "}
          unter <strong>User Management</strong> eintragen:{" "}
          <code className="break-all text-[9px]">{diagnostics.spotifyEmail}</code>
        </p>
      ) : null}

      <p className="text-[10px] leading-snug text-slate-600">
        <strong>Familien-Abo:</strong> Oft reicht der <strong>Embed-Player oben</strong> (bei Spotify im
        Browser eingeloggt = volle Länge). Der In-App-Player darunter ist optional und hängt oft ohne
        Dashboard-Freigabe.
      </p>

      {!playerStarted ? (
        <button
          type="button"
          disabled={loadingPlayer || Boolean(preflightError)}
          onClick={() => void startInAppPlayer()}
          className="flex h-9 w-full items-center justify-center rounded-xl border border-[#1DB954] bg-white text-xs font-semibold text-[#1a7f3c] transition hover:bg-[#1DB954]/10 disabled:opacity-50"
        >
          In-App-Player starten (optional)
        </button>
      ) : (
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => void playAnni()}
          className="flex h-9 w-full items-center justify-center rounded-xl bg-[#1DB954] text-xs font-semibold text-white transition hover:bg-[#1ed760] disabled:opacity-50"
        >
          {busy ? "Starte…" : loadingPlayer ? "Verbinde…" : ready ? "▶ Anni Perka abspielen" : "Verbinde…"}
        </button>
      )}

      {error ? <p className="text-[10px] text-rose-700">{error}</p> : null}
      {diagnostics?.product ? (
        <p className="text-[10px] text-slate-500">Spotify-Produkt: {diagnostics.product}</p>
      ) : null}
      <a
        href={SPOTIFY_ARTIST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-[10px] font-medium text-blue-700 hover:underline"
      >
        In Spotify-App öffnen
      </a>
    </div>
  );
}
