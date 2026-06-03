import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildSpotifyAuthorizeUrl, requireAppUser } from "@/lib/spotify/server";
import { spotifyConfigured } from "@/lib/spotify/config";

export async function GET(request: Request) {
  if (!spotifyConfigured()) {
    return NextResponse.json({ error: "spotify_not_configured" }, { status: 503 });
  }
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.APP_BASE_URL ?? "http://localhost:3000"));
  }

  const reqUrl = new URL(request.url);
  const isPopup = reqUrl.searchParams.get("popup") === "1";
  const forceConsent = reqUrl.searchParams.get("consent") !== "0";

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  if (isPopup) {
    jar.set("spotify_oauth_popup", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
  }
  jar.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(buildSpotifyAuthorizeUrl(state, { forceConsent }));
}
