"use server";

import { NextResponse } from "next/server";
import { getRequestAuth } from "@/lib/auth/request-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mintBoardMeetingLiveKitToken } from "@/lib/live/livekit";
import { hashBoardInviteToken } from "@/lib/board-video/types";
import {
  BOARD_VIDEO_MEETING_SELECT,
  boardMeetingRemainingMs,
  syncBoardVideoMeetingLifecycle,
} from "@/lib/board-video/lifecycle";
import {
  boardMeetingAgendaOpen,
  boardMeetingVideoOpen,
} from "@/lib/board-video/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      slug?: string;
      inviteToken?: string;
      displayName?: string;
    };
    const admin = createSupabaseAdminClient();
    const { user } = await getRequestAuth().catch(() => ({ user: null, supabase: null }));

    let meetingId: string | null = null;
    let participantId: string | null = null;
    let identity: string | null = null;
    let defaultName = "Teilnehmer";

    if (body.inviteToken?.trim()) {
      const hash = hashBoardInviteToken(body.inviteToken.trim());
      const { data: part } = await admin
        .from("board_video_meeting_participants")
        .select("id,meeting_id,video_display_name,is_anni")
        .eq("invite_token_hash", hash)
        .maybeSingle();
      if (!part) {
        return NextResponse.json({ error: "Einladungslink ungültig." }, { status: 403 });
      }
      meetingId = part.meeting_id;
      participantId = part.id;
      identity = `guest:${part.id}`;
      defaultName = part.video_display_name?.trim() || (part.is_anni ? "Anni" : "Gast");
    } else if (body.slug?.trim() && user) {
      const { data: meeting } = await admin
        .from("board_video_meetings")
        .select("id")
        .eq("slug", body.slug.trim())
        .maybeSingle();
      if (!meeting) {
        return NextResponse.json({ error: "Besprechung nicht gefunden." }, { status: 404 });
      }
      const { data: part } = await admin
        .from("board_video_meeting_participants")
        .select("id,video_display_name,user_id")
        .eq("meeting_id", meeting.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!part) {
        return NextResponse.json({ error: "Du bist nicht eingeladen." }, { status: 403 });
      }
      meetingId = meeting.id;
      participantId = part.id;
      identity = `user:${user.id}`;
      const { data: profile } = await admin
        .from("profiles")
        .select("first_name,last_name,email")
        .eq("id", user.id)
        .maybeSingle();
      defaultName =
        part.video_display_name?.trim() ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        "Vorstand";
    } else {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const { data: meeting } = await admin
      .from("board_video_meetings")
      .select(BOARD_VIDEO_MEETING_SELECT)
      .eq("id", meetingId!)
      .maybeSingle();
    if (!meeting) {
      return NextResponse.json({ error: "Besprechung nicht gefunden." }, { status: 404 });
    }

    await syncBoardVideoMeetingLifecycle(admin, meeting);
    const status = meeting.status as string;
    if (status === "ended" || status === "cancelled") {
      return NextResponse.json({ error: "Besprechung ist beendet." }, { status: 410 });
    }

    const videoOpen = boardMeetingVideoOpen(
      meeting.join_opens_at,
      meeting.ends_at,
      meeting.status as "scheduled" | "live" | "ended" | "cancelled",
    );
    if (!videoOpen) {
      return NextResponse.json(
        { error: "Video ist noch nicht geöffnet oder bereits beendet." },
        { status: 403 },
      );
    }

    const displayName = (body.displayName?.trim() || defaultName).slice(0, 40);
    if (participantId && displayName !== defaultName) {
      await admin
        .from("board_video_meeting_participants")
        .update({ video_display_name: displayName })
        .eq("id", participantId);
    }

    if (meeting.status === "scheduled") {
      await admin
        .from("board_video_meetings")
        .update({ status: "live", updated_at: new Date().toISOString() })
        .eq("id", meeting.id);
    }

    const ttlSeconds = Math.ceil(boardMeetingRemainingMs(meeting.ends_at) / 1000);
    const { token, url } = await mintBoardMeetingLiveKitToken({
      roomName: meeting.livekit_room_name,
      identity: identity!,
      name: displayName,
      ttlSeconds,
    });

    return NextResponse.json({
      token,
      url,
      participantId,
      endsAt: meeting.ends_at,
      agendaOpen: boardMeetingAgendaOpen(
        meeting.join_opens_at,
        meeting.ends_at,
        meeting.status as "scheduled" | "live" | "ended" | "cancelled",
      ),
    });
  } catch (e) {
    console.error("[besprechung/token]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Token fehlgeschlagen." },
      { status: 500 },
    );
  }
}
