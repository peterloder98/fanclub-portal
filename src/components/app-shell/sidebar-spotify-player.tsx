"use client";

import { ExternalLink, Music2 } from "lucide-react";
import {
  ANNI_SPOTIFY_EMBED_URL,
  ANNI_SPOTIFY_OPEN_URL,
} from "@/lib/spotify/constants";

/**
 * Spotify in der Sidebar ohne Developer-OAuth.
 * Offizielles Embed + Link in die Spotify-App — funktioniert für alle Mitglieder
 * (Spotify erlaubt Web-API/Web Playback nur noch für riesige Apps / wenige Test-User).
 */
export function SidebarSpotifyPlayer() {
  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-gradient-to-br from-[#1DB954]/10 via-white to-fc-ice p-2">
      <div className="mb-1.5 flex items-center gap-1.5 px-1">
        <Music2 className="h-3.5 w-3.5 text-[#1DB954]" />
        <span className="text-[11px] font-semibold text-slate-800">Anni Perka auf Spotify</span>
      </div>

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

      <p className="mt-1.5 px-1 text-[10px] leading-snug text-slate-500">
        Mit Spotify Premium im Browser eingeloggt hörst du hier volle Songs — sonst Öffnen in der
        App.
      </p>
    </div>
  );
}
