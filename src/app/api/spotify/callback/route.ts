import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeSpotifyCode,
  fetchSpotifyProfile,
  requireAppUser,
  saveSpotifyConnection,
} from "@/lib/spotify/server";

function popupResultUrl(
  base: string,
  jar: Awaited<ReturnType<typeof cookies>>,
  status: "connected" | "error",
  reason?: string,
) {
  const isPopup = jar.get("spotify_oauth_popup")?.value === "1";
  jar.delete("spotify_oauth_popup");
  if (isPopup) {
    const q = new URLSearchParams({ status });
    if (reason) q.set("reason", reason);
    return `${base}/spotify/connect-result?${q}`;
  }
  if (status === "connected") {
    return `${base}/dashboard?spotify=connected`;
  }
  return `${base}/dashboard?spotify=error&reason=${encodeURIComponent(reason ?? "error")}`;
}

export async function GET(request: Request) {
  const base = (process.env.APP_BASE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const jar = await cookies();
  const fail = (reason: string) =>
    NextResponse.redirect(popupResultUrl(base, jar, "error", reason));

  const user = await requireAppUser();
  if (!user) return fail("unauthorized");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = jar.get("spotify_oauth_state")?.value;
  jar.delete("spotify_oauth_state");

  if (!code || !state || !expected || state !== expected) {
    return fail("invalid_state");
  }

  try {
    const tokens = await exchangeSpotifyCode(code);
    if (!tokens.refresh_token) {
      return fail("no_refresh_token");
    }
    const profile = await fetchSpotifyProfile(tokens.access_token);
    await saveSpotifyConnection(user.id, {
      refreshToken: tokens.refresh_token,
      spotifyUserId: profile?.id ?? null,
      displayName: profile?.display_name ?? null,
      scopes: tokens.scope ?? null,
    });
    return NextResponse.redirect(popupResultUrl(base, jar, "connected"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "callback_failed";
    return fail(msg);
  }
}
