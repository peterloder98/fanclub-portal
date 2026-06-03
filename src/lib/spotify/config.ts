export const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

export function spotifyClientId() {
  const id = process.env.SPOTIFY_CLIENT_ID?.trim();
  if (!id) throw new Error("SPOTIFY_CLIENT_ID fehlt.");
  return id;
}

export function spotifyClientSecret() {
  const secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("SPOTIFY_CLIENT_SECRET fehlt.");
  return secret;
}

export function spotifyRedirectUri() {
  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  if (!base) throw new Error("APP_BASE_URL fehlt für Spotify Redirect.");
  return `${base}/api/spotify/callback`;
}

export function spotifyConfigured() {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID?.trim() &&
      process.env.SPOTIFY_CLIENT_SECRET?.trim() &&
      (process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()),
  );
}
