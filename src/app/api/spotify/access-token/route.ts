import { NextResponse } from "next/server";
import { getSpotifyAccessTokenForUser, requireAppUser } from "@/lib/spotify/server";

export async function GET() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const accessToken = await getSpotifyAccessTokenForUser(user.id);
  if (!accessToken) {
    return NextResponse.json({ error: "not_connected" }, { status: 404 });
  }
  return NextResponse.json({ access_token: accessToken });
}
