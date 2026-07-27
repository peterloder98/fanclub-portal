"use client";

import { ANNI_SPOTIFY_EMBED_URL } from "@/lib/spotify/constants";

/**
 * Spotify in der Sidebar ohne Developer-OAuth.
 * Offizielles Embed — gleiche Breite wie Menükästen.
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
    </div>
  );
}
