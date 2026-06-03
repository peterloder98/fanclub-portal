import { ANNI_SPOTIFY_ARTIST_ID } from "@/lib/spotify/constants";

export function SpotifyEmbedPlayer({ height = 152 }: { height?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-blue-200/60 shadow-sm shadow-blue-900/5 ring-1 ring-rose-500/10">
      <iframe
        title="Spotify — Anni Perka"
        src={`https://open.spotify.com/embed/artist/${ANNI_SPOTIFY_ARTIST_ID}?utm_source=generator&theme=0`}
        width="100%"
        height={height}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="block border-0"
      />
    </div>
  );
}
