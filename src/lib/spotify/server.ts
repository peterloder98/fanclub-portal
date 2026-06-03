import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptSpotifyToken, encryptSpotifyToken } from "@/lib/spotify/crypto";
import {
  spotifyClientId,
  spotifyClientSecret,
  spotifyRedirectUri,
} from "@/lib/spotify/config";

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

export async function getSpotifyConnection(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("spotify_connections")
    .select("user_id,refresh_token_ciphertext,spotify_user_id,display_name,scopes")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveSpotifyConnection(
  userId: string,
  input: {
    refreshToken: string;
    spotifyUserId?: string | null;
    displayName?: string | null;
    scopes?: string | null;
  },
) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("spotify_connections").upsert({
    user_id: userId,
    refresh_token_ciphertext: encryptSpotifyToken(input.refreshToken),
    spotify_user_id: input.spotifyUserId ?? null,
    display_name: input.displayName ?? null,
    scopes: input.scopes ?? null,
  });
  if (error) throw error;
}

export async function deleteSpotifyConnection(userId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("spotify_connections").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function exchangeSpotifyCode(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: spotifyRedirectUri(),
    client_id: spotifyClientId(),
    client_secret: spotifyClientSecret(),
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as TokenResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Spotify Token-Austausch fehlgeschlagen.");
  return json;
}

export async function refreshSpotifyAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: spotifyClientId(),
    client_secret: spotifyClientSecret(),
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as TokenResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Spotify Refresh fehlgeschlagen.");
  return json;
}

export async function getSpotifyAccessTokenForUser(userId: string) {
  const row = await getSpotifyConnection(userId);
  if (!row?.refresh_token_ciphertext) return null;
  const refreshToken = decryptSpotifyToken(row.refresh_token_ciphertext);
  const tokens = await refreshSpotifyAccessToken(refreshToken);
  if (tokens.refresh_token) {
    await saveSpotifyConnection(userId, {
      refreshToken: tokens.refresh_token,
      spotifyUserId: row.spotify_user_id,
      displayName: row.display_name,
      scopes: row.scopes,
    });
  }
  return tokens.access_token;
}

export async function fetchSpotifyProfile(accessToken: string) {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as { id: string; display_name?: string };
}

export function buildSpotifyAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: spotifyClientId(),
    response_type: "code",
    redirect_uri: spotifyRedirectUri(),
    scope: "user-read-email user-read-private streaming user-read-playback-state user-modify-playback-state",
    state,
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

export async function requireAppUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
