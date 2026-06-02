"use client";

import { Music2 } from "lucide-react";
import { ANNI_SPOTIFY_ARTIST_ID } from "@/lib/spotify/constants";

/**
 * Offizieller Spotify-Embed: volle Titel nach Klick auf Play im Widget
 * (keine 30-Sekunden-API-Vorschauen). Shuffle/Repeat steuert man im Embed.
 */
export function SidebarSpotifyPlayer() {
  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-gradient-to-br from-blue-600/10 via-white to-rose-500/10 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 px-1">
        <Music2 className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-[11px] font-semibold text-slate-800">Anni Perka</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-blue-200/60 shadow-sm shadow-blue-900/5 ring-1 ring-rose-500/10">
        <iframe
          title="Spotify — Anni Perka"
          src={`https://open.spotify.com/embed/artist/${ANNI_SPOTIFY_ARTIST_ID}?utm_source=generator&theme=0`}
          width="100%"
          height="152"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="block border-0"
        />
      </div>
    </div>
  );
}
