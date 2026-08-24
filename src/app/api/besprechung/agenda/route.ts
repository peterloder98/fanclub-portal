import { NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/auth/request-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashBoardInviteToken } from "@/lib/board-video/types";
import { syncBoardVideoMeetingLifecycle, BOARD_VIDEO_MEETING_SELECT } from "@/lib/board-video/lifecycle";
import { boardMeetingAgendaOpen, boardMeetingCheckoffOpen } from "@/lib/board-video/types";

async function resolveActor(input: {
  meetingId: string;
  slug?: string;
  inviteToken?: string;
}): Promise<
  | { ok: true; actorName: string; actorUserId: string | null; meeting: { id: string; join_opens_at: string; ends_at: string; status: string } }
  | { ok: false; status: number; error: string }
> {
  const admin = createSupabaseAdminClient();
  const { user } = await getRequestAuth().catch(() => ({ user: null, supabase: null }));

  const { data: meeting } = await admin
    .from("board_video_meetings")
    .select(BOARD_VIDEO_MEETING_SELECT)
    .eq("id", input.meetingId)
    .maybeSingle();
  if (!meeting) return { ok: false, status: 404, error: "Besprechung nicht gefunden." };

  await syncBoardVideoMeetingLifecycle(admin, meeting);

  if (input.inviteToken?.trim()) {
    const hash = hashBoardInviteToken(input.inviteToken.trim());
    const { data: part } = await admin
      .from("board_video_meeting_participants")
      .select("id,video_display_name,is_anni,meeting_id")
      .eq("invite_token_hash", hash)
      .eq("meeting_id", input.meetingId)
      .maybeSingle();
    if (!part) return { ok: false, status: 403, error: "Kein Zugang." };
    return {
      ok: true,
      actorName: part.video_display_name?.trim() || (part.is_anni ? "Anni" : "Gast"),
      actorUserId: null,
      meeting,
    };
  }

  if (!user) return { ok: false, status: 401, error: "Nicht angemeldet." };
  const { data: part } = await admin
    .from("board_video_meeting_participants")
    .select("id,video_display_name,user_id")
    .eq("meeting_id", input.meetingId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!part) return { ok: false, status: 403, error: "Du bist nicht eingeladen." };

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", user.id)
    .maybeSingle();
  const actorName =
    part.video_display_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "Vorstand";

  return { ok: true, actorName, actorUserId: user.id, meeting };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const meetingId = url.searchParams.get("meetingId");
  if (!meetingId) {
    return NextResponse.json({ error: "meetingId fehlt." }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("board_video_meeting_agenda_items")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action: "upsert" | "toggle";
    meetingId: string;
    inviteToken?: string;
    itemId?: string;
    text?: string;
    checked?: boolean;
  };

  const actor = await resolveActor({
    meetingId: body.meetingId,
    inviteToken: body.inviteToken,
  });
  if (!actor.ok) {
    return NextResponse.json({ error: actor.error }, { status: actor.status });
  }

  const agendaOpen = boardMeetingAgendaOpen(
    actor.meeting.join_opens_at,
    actor.meeting.ends_at,
    actor.meeting.status as "scheduled" | "live" | "ended" | "cancelled",
  );
  if (!agendaOpen) {
    return NextResponse.json({ error: "Agenda ist geschlossen." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  if (body.action === "upsert") {
    const text = body.text?.trim() ?? "";
    if (text.length < 1 || text.length > 500) {
      return NextResponse.json({ error: "1–500 Zeichen." }, { status: 400 });
    }
    if (body.itemId) {
      const { data, error } = await admin
        .from("board_video_meeting_agenda_items")
        .update({
          body: text,
          updated_by: actor.actorUserId,
          updated_by_name: actor.actorName,
          updated_at: now,
        })
        .eq("id", body.itemId)
        .eq("meeting_id", body.meetingId)
        .select("*")
        .maybeSingle();
      if (error || !data) {
        return NextResponse.json({ error: error?.message ?? "Nicht gefunden." }, { status: 404 });
      }
      return NextResponse.json({ item: data });
    }
    const { data: maxRow } = await admin
      .from("board_video_meeting_agenda_items")
      .select("sort_order")
      .eq("meeting_id", body.meetingId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await admin
      .from("board_video_meeting_agenda_items")
      .insert({
        meeting_id: body.meetingId,
        body: text,
        sort_order: (maxRow?.sort_order ?? 0) + 1,
        created_by: actor.actorUserId,
        created_by_name: actor.actorName,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  }

  if (body.action === "toggle") {
    const checkoffOpen = boardMeetingCheckoffOpen(
      actor.meeting.join_opens_at,
      actor.meeting.ends_at,
      actor.meeting.status as "scheduled" | "live" | "ended" | "cancelled",
    );
    if (!checkoffOpen) {
      return NextResponse.json({ error: "Abhaken erst während des Calls." }, { status: 403 });
    }
    if (!body.itemId) {
      return NextResponse.json({ error: "itemId fehlt." }, { status: 400 });
    }
    const checked = Boolean(body.checked);
    const { error } = await admin
      .from("board_video_meeting_agenda_items")
      .update({
        checked_at: checked ? now : null,
        checked_by: checked ? actor.actorUserId : null,
        checked_by_name: checked ? actor.actorName : null,
        updated_at: now,
      })
      .eq("id", body.itemId)
      .eq("meeting_id", body.meetingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
