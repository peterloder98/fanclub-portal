"use client";

import { ExternalLink } from "lucide-react";
import {
  ANNI_SPOTIFY_EMBED_URL,
  ANNI_SPOTIFY_OPEN_URL,
} from "@/lib/spotify/constants";

/**
 * Spotify in der Sidebar ohne Developer-OAuth.
 * Offizielles Embed + Link in die Spotify-App — funktioniert für alle Mitglieder.
 */
export function SidebarSpotifyPlayer() {
  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-gradient-to-br from-[#1DB954]/10 via-white to-fc-ice p-2">
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <iframe
          title="Anni Perka auf Spotify"
          src={ANNI_SPOTIFY_EMBED_URL}
          width="100%"
          height={152}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="block w-full border-0"
        />
      </div>

      <a
        href={ANNI_SPOTIFY_OPEN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1DB954] text-xs font-semibold text-white shadow-sm transition hover:bg-[#1ed760]"
      >
        In Spotify öffnen
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>
  );
}
