"use client";

import { useEffect, useState } from "react";
import { ANNI_SPOTIFY_ARTIST_ID } from "@/lib/spotify/constants";

const EMBED_SRC = `https://open.spotify.com/embed/artist/${ANNI_SPOTIFY_ARTIST_ID}?utm_source=generator&theme=0`;
const ARTIST_URL = `https://open.spotify.com/artist/${ANNI_SPOTIFY_ARTIST_ID}`;

export function SpotifyEmbedPlayer({ height = 352 }: { height?: number }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!loaded) setFailed(true);
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [loaded]);

  if (failed) {
    return (
      <div
        className="grid place-items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-6 text-center"
        style={{ minHeight: height }}
      >
        <p className="text-[10px] leading-snug text-amber-900">
          Spotify-Embed konnte hier nicht laden (Timeout). Bitte direkt in Spotify öffnen — dort
          funktioniert es für alle Mitglieder ohne Extra-Anmeldung in der App.
        </p>
        <a
          href={ARTIST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex h-9 items-center rounded-xl bg-[#1DB954] px-4 text-xs font-semibold text-white"
        >
          Anni Perka in Spotify öffnen
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-blue-200/60 shadow-sm shadow-blue-900/5 ring-1 ring-rose-500/10">
      {!loaded ? (
        <div
          className="grid place-items-center bg-slate-50 text-[10px] text-slate-500"
          style={{ height }}
        >
          Player wird geladen…
        </div>
      ) : null}
      <iframe
        title="Spotify — Anni Perka"
        src={EMBED_SRC}
        width="100%"
        height={height}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className={`block border-0 ${loaded ? "" : "h-0 w-0 overflow-hidden"}`}
        onLoad={() => {
          setLoaded(true);
          setFailed(false);
        }}
      />
    </div>
  );
}
