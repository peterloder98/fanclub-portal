import { NextResponse } from "next/server";
import { spotifyConfigured } from "@/lib/spotify/config";
import { getSpotifyConnection, requireAppUser } from "@/lib/spotify/server";

export async function GET() {
  if (!spotifyConfigured()) {
    return NextResponse.json({ configured: false, connected: false });
  }
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ configured: true, connected: false });
  }
  try {
    const row = await getSpotifyConnection(user.id);
    return NextResponse.json({
      configured: true,
      connected: Boolean(row),
      displayName: row?.display_name ?? null,
    });
  } catch {
    return NextResponse.json({
      configured: true,
      connected: false,
      displayName: null,
      migrationHint: "supabase/026_spotify_connections.sql",
    });
  }
}
