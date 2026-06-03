"use client";

import { useEffect, useState } from "react";
import type { SpotifyOAuthMessage } from "@/lib/spotify/open-connect-popup";

export function SpotifyConnectResultClient({
  status,
  reason,
}: {
  status: "connected" | "error";
  reason: string | null;
}) {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const payload: SpotifyOAuthMessage = {
      type: "spotify_oauth",
      status,
      reason,
    };
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin);
    }
    window.close();
    const t = window.setTimeout(() => setClosed(true), 400);
    return () => window.clearTimeout(t);
  }, [status, reason]);

  if (status === "connected") {
    return (
      <div className="grid min-h-[40vh] place-items-center p-6 text-center">
        <p className="text-sm font-medium text-slate-800">Spotify verbunden — Fenster schließt sich …</p>
        {closed ? (
          <p className="mt-2 text-xs text-slate-600">Du kannst dieses Tab/Fenster jetzt schließen.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid min-h-[40vh] place-items-center p-6 text-center">
      <p className="text-sm font-medium text-rose-800">Spotify-Verbindung fehlgeschlagen</p>
      {reason ? <p className="mt-2 text-xs text-slate-600">{reason}</p> : null}
      {closed ? (
        <p className="mt-2 text-xs text-slate-600">Fenster schließen und es erneut versuchen.</p>
      ) : null}
    </div>
  );
}
