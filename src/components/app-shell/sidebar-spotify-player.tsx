"use client";

import { ExternalLink } from "lucide-react";
import {
  ANNI_SPOTIFY_EMBED_URL,
  ANNI_SPOTIFY_OPEN_URL,
} from "@/lib/spotify/constants";

/**
 * Spotify in der Sidebar ohne Developer-OAuth.
 * Offizielles Embed + Link in die Spotify-App — gleiche Breite wie Menükästen.
 */
export function SidebarSpotifyPlayer() {
  return (
    <div className="w-full overflow-hidden rounded-2xl bg-white/70 shadow-sm shadow-slate-900/5">
      <iframe
        title="Anni Perka auf Spotify"
        src={ANNI_SPOTIFY_EMBED_URL}
        width="100%"
        height={152}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="block w-full border-0"
      />
      <a
        href={ANNI_SPOTIFY_OPEN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 w-full items-center justify-center gap-1.5 bg-[#1DB954] text-xs font-semibold text-white transition hover:bg-[#1ed760]"
      >
        In Spotify öffnen
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>
  );
}
