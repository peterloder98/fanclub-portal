import { NextResponse } from "next/server";
import { spotifyConfigured } from "@/lib/spotify/config";
import {
  getSpotifyConnection,
  getSpotifyDiagnostics,
  requireAppUser,
} from "@/lib/spotify/server";

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
    const diagnostics = row ? await getSpotifyDiagnostics(user.id) : null;
    return NextResponse.json({
      configured: true,
      connected: Boolean(row),
      displayName:
        diagnostics && "displayName" in diagnostics && diagnostics.displayName
          ? diagnostics.displayName
          : row?.display_name ?? null,
      diagnostics:
        diagnostics && diagnostics.connected
          ? {
              tokenOk: diagnostics.tokenOk,
              tokenError: diagnostics.tokenError,
              scopeOk: diagnostics.scopeOk,
              scopes: diagnostics.scopes,
              premium: diagnostics.premium,
              product: diagnostics.product,
            }
          : null,
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
