const POPUP_NAME = "fanclub_spotify_connect";

export function openSpotifyConnectPopup() {
  const width = 480;
  const height = 720;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
  const features = [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "toolbar=no",
    "menubar=no",
    "location=yes",
    "status=no",
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");

  const popup = window.open("/api/spotify/login?popup=1", POPUP_NAME, features);
  return popup;
}

export type SpotifyOAuthMessage = {
  type: "spotify_oauth";
  status: "connected" | "error";
  reason?: string | null;
};

export function isSpotifyOAuthMessage(data: unknown): data is SpotifyOAuthMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as SpotifyOAuthMessage).type === "spotify_oauth" &&
    ((data as SpotifyOAuthMessage).status === "connected" ||
      (data as SpotifyOAuthMessage).status === "error")
  );
}
