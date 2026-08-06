import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mintLiveKitToken } from "@/lib/live/livekit";
import {
  canMembersJoinSession,
  hashLiveHostToken,
  type LiveSessionRow,
} from "@/lib/live/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Token fehlt." }, { status: 400 });
    }

    const hash = hashLiveHostToken(token);
    const admin = createSupabaseAdminClient();
    const { data: session, error } = await admin
      .from("live_sessions")
      .select(
        "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
      )
      .eq("host_token_hash", hash)
      .maybeSingle();

    if (error || !session) {
      return NextResponse.json({ error: "Ungültiger Host-Link." }, { status: 404 });
    }

    const row = session as LiveSessionRow;
    if (row.status === "ended" || row.status === "cancelled") {
      return NextResponse.json({ error: "Diese Session ist beendet." }, { status: 403 });
    }

    // Host darf etwas früher rein als die Mitglieder-Anzeige, aber nicht nach Ende
    if (new Date() > new Date(row.ends_at)) {
      return NextResponse.json({ error: "Session-Zeitfenster vorbei." }, { status: 403 });
    }

    if (row.status === "scheduled") {
      await admin
        .from("live_sessions")
        .update({ status: "live", updated_at: new Date().toISOString() })
        .eq("id", row.id);
    }

    const { token: lkToken, url } = await mintLiveKitToken({
      roomName: row.livekit_room_name,
      identity: "host:anni",
      name: "Anni",
      canPublish: true,
    });

    return NextResponse.json({
      token: lkToken,
      url,
      roomName: row.livekit_room_name,
      sessionId: row.id,
      slug: row.slug,
      title: row.title,
      status: "live",
      canJoinMembers: canMembersJoinSession({ ...row, status: "live" }),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler." },
      { status: 500 },
    );
  }
}
