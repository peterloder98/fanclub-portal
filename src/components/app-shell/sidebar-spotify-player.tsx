"use client";

import { useState } from "react";
import { Music2 } from "lucide-react";
import { SpotifyEmbedPlayer } from "@/components/app-shell/spotify-embed-player";
import { ANNI_SPOTIFY_ARTIST_ID } from "@/lib/spotify/constants";

const SPOTIFY_ARTIST_URL = `https://open.spotify.com/artist/${ANNI_SPOTIFY_ARTIST_ID}`;
const SPOTIFY_LOGIN_URL = "https://open.spotify.com/login";

export function SidebarSpotifyPlayer() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-gradient-to-br from-blue-600/10 via-white to-rose-500/10 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 px-1">
        <Music2 className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-[11px] font-semibold text-slate-800">Anni Perka</span>
      </div>

      <p className="mb-2 px-1 text-[10px] leading-snug text-slate-600">
        <strong>Volle Songs</strong> mit Premium/Familien-Abo — am zuverlässigsten direkt in Spotify.
        Der Player unten ist nur eine Vorschau, solange Spotify dich im Browser nicht erkennt
        (graues <strong>„Preview“</strong> neben dem Play-Button).
      </p>

      <a
        href={SPOTIFY_ARTIST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-10 w-full items-center justify-center rounded-xl bg-[#1DB954] text-xs font-semibold text-white shadow-sm transition hover:bg-[#1ed760]"
      >
        ▶ Volle Songs in Spotify
      </a>

      <a
        href={SPOTIFY_LOGIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex h-8 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Zuerst bei Spotify anmelden (gleicher Browser)
      </a>

      <button
        type="button"
        onClick={() => setShowHelp((v) => !v)}
        className="mt-2 w-full text-left text-[10px] font-medium text-blue-700 hover:underline"
      >
        {showHelp ? "▲" : "▼"} Nur 30 Sekunden / „Preview“ — was tun?
      </button>

      {showHelp ? (
        <ol className="mt-1 list-decimal space-y-1 px-3 text-[10px] leading-snug text-slate-600">
          <li>
            Mit deinem <strong>Familien-Profil</strong> (Premium-Slot) bei{" "}
            <a href={SPOTIFY_LOGIN_URL} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
              open.spotify.com
            </a>{" "}
            anmelden — nicht nur in der Handy-App.
          </li>
          <li>Fanclub-Tab neu laden (Cmd+Shift+R). Steht noch „Preview“, Cookies/Werbeblocker prüfen.</li>
          <li>
            Dann oben <strong>„Volle Songs in Spotify“</strong> — dort hört ihr immer die kompletten
            Titel.
          </li>
          <li>
            Volle Wiedergabe <em>für alle</em> direkt in der App ohne Spotify-Login ist bei Spotify
            technisch nicht frei — nur mit Spotify „Extended Quota“ (Admin → Spotify-Einstellungen).
          </li>
        </ol>
      ) : null}

      <p className="mt-3 mb-1 px-1 text-[10px] font-medium text-slate-500">Vorschau im Portal</p>
      <SpotifyEmbedPlayer height={280} />
    </div>
  );
}
