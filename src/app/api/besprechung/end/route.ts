import { NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/auth/request-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteLiveKitRoom } from "@/lib/live/livekit";

export async function POST(req: Request) {
  const { user } = await getRequestAuth().catch(() => ({ user: null, supabase: null }));
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = (await req.json()) as { meetingId?: string };
  if (!body.meetingId) {
    return NextResponse.json({ error: "meetingId fehlt." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Nur Vorstände können beenden." }, { status: 403 });
  }

  const { data: part } = await admin
    .from("board_video_meeting_participants")
    .select("id")
    .eq("meeting_id", body.meetingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!part) {
    return NextResponse.json({ error: "Du bist nicht Teil dieser Besprechung." }, { status: 403 });
  }

  const { data: meeting } = await admin
    .from("board_video_meetings")
    .select("id,livekit_room_name,status")
    .eq("id", body.meetingId)
    .maybeSingle();
  if (!meeting) {
    return NextResponse.json({ error: "Besprechung nicht gefunden." }, { status: 404 });
  }

  await admin
    .from("board_video_meetings")
    .update({ status: "ended", updated_at: new Date().toISOString() })
    .eq("id", meeting.id);
  await deleteLiveKitRoom(meeting.livekit_room_name);

  return NextResponse.json({ ok: true });
}
