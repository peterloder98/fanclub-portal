import { NextResponse } from "next/server";
import { deleteSpotifyConnection, requireAppUser } from "@/lib/spotify/server";

export async function POST() {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await deleteSpotifyConnection(user.id);
  return NextResponse.json({ ok: true });
}
