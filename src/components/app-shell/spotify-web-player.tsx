"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ANNI_SPOTIFY_ARTIST_ID } from "@/lib/spotify/constants";
import { connectSpotifyWebPlaybackPlayer } from "@/lib/spotify/web-playback-player";
import type { SpotifyDiagnostics } from "@/components/app-shell/spotify-web-player-types";

export function SpotifyWebPlayer({
  displayName,
  diagnostics,
}: {
  displayName: string | null;
  diagnostics?: SpotifyDiagnostics | null;
}) {
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

  useEffect(() => {
    if (diagnostics) {
      if (!diagnostics.tokenOk && diagnostics.tokenError) {
        setError(diagnostics.tokenError);
        return;
      }
      if (diagnostics.premium === false) {
        setError(
          `Spotify-Konto: „${diagnostics.product ?? "unbekannt"}“ — Web-Player braucht Premium. Unten die eingebettete Vorschau nutzen.`,
        );
        return;
      }
      if (!diagnostics.scopeOk) {
        setError(
          'Berechtigung „streaming“ fehlt. Bitte „Trennen“ und erneut „Mit Spotify verbinden“ (Häkchen bei Spotify setzen).',
        );
        return;
      }
    }

    let cancelled = false;
    async function init() {
      try {
        const deviceId = await connectSpotifyWebPlaybackPlayer(getToken);
        if (cancelled) return;
        deviceIdRef.current = deviceId;
        setReady(Boolean(deviceId));
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Player-Start fehlgeschlagen");
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [getToken, diagnostics]);

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
        const body = await playRes.text().catch(() => "");
        throw new Error(
          playRes.status === 403
            ? "Wiedergabe verweigert (Premium/Device). Spotify-App einmal öffnen und erneut versuchen."
            : `Wiedergabe fehlgeschlagen (${playRes.status})${body ? `: ${body.slice(0, 120)}` : ""}`,
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
        {busy ? "Starte…" : ready ? "▶ Anni Perka abspielen" : error ? "Player nicht verfügbar" : "Player verbindet…"}
      </button>
      {error ? <p className="text-[10px] text-rose-700">{error}</p> : null}
      {diagnostics?.product ? (
        <p className="text-[10px] text-slate-500">Spotify-Produkt: {diagnostics.product}</p>
      ) : null}
      <p className="text-[10px] text-slate-500">
        Premium nötig für den grünen Button. Hilft oft: Trennen → neu verbinden, Spotify-App kurz öffnen.
      </p>
    </div>
  );
}
