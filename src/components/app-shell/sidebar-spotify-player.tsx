"use client";

import { Music2 } from "lucide-react";
import { SpotifyEmbedPlayer } from "@/components/app-shell/spotify-embed-player";
import { ANNI_SPOTIFY_ARTIST_ID } from "@/lib/spotify/constants";

const SPOTIFY_ARTIST_URL = `https://open.spotify.com/artist/${ANNI_SPOTIFY_ARTIST_ID}`;

/**
 * Spotify für alle Mitglieder ohne Developer-User-Liste:
 * offizieller Embed (kein OAuth pro Nutzer nötig).
 * Volle Titel: Nutzer:in bei spotify.com im selben Browser eingeloggt (Premium/Familie).
 */
export function SidebarSpotifyPlayer() {
  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-gradient-to-br from-blue-600/10 via-white to-rose-500/10 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 px-1">
        <Music2 className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-[11px] font-semibold text-slate-800">Anni Perka</span>
      </div>

      <p className="mb-2 px-1 text-[10px] leading-snug text-slate-600">
        Für <strong>alle Mitglieder</strong> — kein separates Anmelden in der App. Mit Spotify Premium
        (auch Familien-Profil): einmal im Browser bei{" "}
        <a
          href="https://open.spotify.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-700 underline"
        >
          Spotify
        </a>{" "}
        einloggen, dann hier volle Songs im Player.
      </p>

      <SpotifyEmbedPlayer />

      <a
        href={SPOTIFY_ARTIST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex h-8 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        In Spotify-App öffnen
      </a>
    </div>
  );
}
