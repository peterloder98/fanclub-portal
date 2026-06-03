import { NextResponse } from "next/server";
import { getSpotifyAccessTokenForUser, requireAppUser } from "@/lib/spotify/server";

export async function GET() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const accessToken = await getSpotifyAccessTokenForUser(user.id);
    if (!accessToken) {
      return NextResponse.json({ error: "not_connected" }, { status: 404 });
    }
    return NextResponse.json({ access_token: accessToken });
  } catch (e) {
    const message = e instanceof Error ? e.message : "token_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
