"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseAdminWallClockToUtcIso } from "@/lib/datetime/berlin";
import { resolveLiveAnniEmail } from "@/lib/live/anni-recipient";
import { profileDisplayName } from "@/lib/profiles/display";
import { deleteLiveKitRoom } from "@/lib/live/livekit";
import {
  boardMeetingEndsAt,
  boardMeetingGuestUrl,
  boardMeetingJoinOpensAt,
  boardMeetingRoomUrl,
  generateBoardInviteToken,
  hashBoardInviteToken,
  liveKitRoomNameForBoardMeeting,
  slugifyBoardMeetingTitle,
  type BoardVideoAgendaItemRow,
  type BoardVideoMeetingRow,
  type BoardVideoParticipantRow,
} from "@/lib/board-video/types";
import { BOARD_VIDEO_MEETING_SELECT, syncBoardVideoMeetingLifecycle } from "@/lib/board-video/lifecycle";
import { sendBoardMeetingInviteEmails } from "@/lib/board-video/invites";

export type AdminBoardMeetingRow = BoardVideoMeetingRow;
export type AdminOption = { id: string; label: string; email: string };

function parseStartsAt(raw: string): string {
  return parseAdminWallClockToUtcIso(raw, "Start");
}

export async function loadAdminBoardMeetingOptions(): Promise<AdminOption[]> {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,first_name,last_name,email,role")
    .eq("role", "admin")
    .order("last_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id,
    email: (p.email ?? "").trim().toLowerCase(),
    label: profileDisplayName({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
    }),
  }));
}

export async function loadAdminBoardMeetings(): Promise<BoardVideoMeetingRow[]> {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("board_video_meetings")
    .select(BOARD_VIDEO_MEETING_SELECT)
    .order("starts_at", { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return (data ?? []) as BoardVideoMeetingRow[];
}

export async function createBoardVideoMeetingAction(input: {
  title: string;
  startsAt: string;
  participantUserIds: string[];
  sendInvites?: boolean;
}): Promise<
  | { ok: true; id: string; slug: string; roomUrl: string; anniGuestUrl: string }
  | { ok: false; error: string }
> {
  try {
    const { user } = await requireAdminAction();
    const title = input.title.trim();
    if (title.length < 2 || title.length > 120) {
      return { ok: false, error: "Titel: 2–120 Zeichen." };
    }

    const starts_at = parseStartsAt(input.startsAt);
    const ends_at = boardMeetingEndsAt(starts_at);
    const join_opens_at = boardMeetingJoinOpensAt(starts_at);
    const ids = [...new Set(input.participantUserIds.filter(Boolean))];
    if (ids.length < 1) {
      return { ok: false, error: "Mindestens ein Vorstand muss ausgewählt sein." };
    }

    const admin = createSupabaseAdminClient();
    const { data: profiles, error: pErr } = await admin
      .from("profiles")
      .select("id,email,first_name,last_name,gender,role")
      .in("id", ids)
      .eq("role", "admin");
    if (pErr) return { ok: false, error: pErr.message };
    if (!profiles?.length) {
      return { ok: false, error: "Keine gültigen Vorstände ausgewählt." };
    }

    const id = crypto.randomUUID();
    const slug = slugifyBoardMeetingTitle(title);
    const livekit_room_name = liveKitRoomNameForBoardMeeting(id);
    const { token: anniToken, hash: anniHash } = generateBoardInviteToken();

    const { error: insErr } = await admin.from("board_video_meetings").insert({
      id,
      slug,
      title,
      starts_at,
      ends_at,
      join_opens_at,
      status: "scheduled",
      livekit_room_name,
      created_by: user.id,
    });
    if (insErr) return { ok: false, error: insErr.message };

    const participantRows: Array<{
      meeting_id: string;
      user_id: string | null;
      email: string;
      is_anni: boolean;
      invite_token_hash: string | null;
    }> = profiles.map((p) => ({
      meeting_id: id,
      user_id: p.id,
      email: (p.email ?? "").trim().toLowerCase(),
      is_anni: false,
      invite_token_hash: null,
    }));

    participantRows.push({
      meeting_id: id,
      user_id: null,
      email: resolveLiveAnniEmail(),
      is_anni: true,
      invite_token_hash: anniHash,
    });

    const { error: partErr } = await admin.from("board_video_meeting_participants").insert(participantRows);
    if (partErr) return { ok: false, error: partErr.message };

    const roomUrl = boardMeetingRoomUrl(slug);
    const anniGuestUrl = boardMeetingGuestUrl(anniToken);

    if (input.sendInvites !== false) {
      after(async () => {
        try {
          const result = await sendBoardMeetingInviteEmails({
            meeting: { id, slug, title, starts_at, ends_at, join_opens_at },
            adminParticipants: profiles.map((p) => ({
              email: (p.email ?? "").trim().toLowerCase(),
              firstName: p.first_name,
              gender: p.gender,
            })),
            anniGuestUrl,
          });
          if (result.sent > 0) {
            await admin
              .from("board_video_meetings")
              .update({
                invites_sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", id);
          }
        } catch (e) {
          console.error("[board-video] invite emails failed", e);
        }
      });
    }

    revalidatePath("/admin/besprechung");
    return { ok: true, id, slug, roomUrl, anniGuestUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Anlegen fehlgeschlagen." };
  }
}

export async function endBoardVideoMeetingAction(meetingId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminAction();
    const admin = createSupabaseAdminClient();
    const { data: meeting, error } = await admin
      .from("board_video_meetings")
      .select("id,livekit_room_name,status")
      .eq("id", meetingId)
      .maybeSingle();
    if (error || !meeting) return { ok: false, error: "Besprechung nicht gefunden." };
    if (meeting.status === "ended" || meeting.status === "cancelled") {
      return { ok: true };
    }
    await admin
      .from("board_video_meetings")
      .update({ status: "ended", updated_at: new Date().toISOString() })
      .eq("id", meetingId);
    await deleteLiveKitRoom(meeting.livekit_room_name);
    revalidatePath("/admin/besprechung");
    revalidatePath("/besprechung");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Beenden fehlgeschlagen." };
  }
}

export async function cancelBoardVideoMeetingAction(
  meetingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminAction();
    const admin = createSupabaseAdminClient();
    const { data: meeting } = await admin
      .from("board_video_meetings")
      .select("id,livekit_room_name,status")
      .eq("id", meetingId)
      .maybeSingle();
    if (!meeting) return { ok: false, error: "Besprechung nicht gefunden." };
    await admin
      .from("board_video_meetings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", meetingId);
    await deleteLiveKitRoom(meeting.livekit_room_name);
    revalidatePath("/admin/besprechung");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Absagen fehlgeschlagen." };
  }
}

export async function upsertBoardAgendaItemAction(input: {
  meetingId: string;
  itemId?: string;
  body: string;
  actorName: string;
  actorUserId?: string | null;
}): Promise<{ ok: true; item: BoardVideoAgendaItemRow } | { ok: false; error: string }> {
  try {
    const body = input.body.trim();
    if (body.length < 1 || body.length > 500) {
      return { ok: false, error: "Agenda-Punkt: 1–500 Zeichen." };
    }
    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    if (input.itemId) {
      const { data, error } = await admin
        .from("board_video_meeting_agenda_items")
        .update({
          body,
          updated_by: input.actorUserId ?? null,
          updated_by_name: input.actorName,
          updated_at: now,
        })
        .eq("id", input.itemId)
        .eq("meeting_id", input.meetingId)
        .select("*")
        .maybeSingle();
      if (error || !data) return { ok: false, error: error?.message ?? "Punkt nicht gefunden." };
      return { ok: true, item: data as BoardVideoAgendaItemRow };
    }

    const { data: maxRow } = await admin
      .from("board_video_meeting_agenda_items")
      .select("sort_order")
      .eq("meeting_id", input.meetingId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sort_order = (maxRow?.sort_order ?? 0) + 1;

    const { data, error } = await admin
      .from("board_video_meeting_agenda_items")
      .insert({
        meeting_id: input.meetingId,
        body,
        sort_order,
        created_by: input.actorUserId ?? null,
        created_by_name: input.actorName,
      })
      .select("*")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Speichern fehlgeschlagen." };
    return { ok: true, item: data as BoardVideoAgendaItemRow };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Agenda fehlgeschlagen." };
  }
}

export async function toggleBoardAgendaItemAction(input: {
  meetingId: string;
  itemId: string;
  checked: boolean;
  actorName: string;
  actorUserId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin
      .from("board_video_meeting_agenda_items")
      .update({
        checked_at: input.checked ? now : null,
        checked_by: input.checked ? (input.actorUserId ?? null) : null,
        checked_by_name: input.checked ? input.actorName : null,
        updated_at: now,
      })
      .eq("id", input.itemId)
      .eq("meeting_id", input.meetingId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Abhaken fehlgeschlagen." };
  }
}

export async function setBoardParticipantDisplayNameAction(input: {
  participantId: string;
  displayName: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const name = input.displayName.trim().slice(0, 40);
    if (name.length < 1) return { ok: false, error: "Name: mindestens 1 Zeichen." };
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("board_video_meeting_participants")
      .update({ video_display_name: name })
      .eq("id", input.participantId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Name speichern fehlgeschlagen." };
  }
}

export async function resolveBoardMeetingAccess(input: {
  slug?: string;
  inviteToken?: string;
  userId?: string | null;
}): Promise<
  | {
      ok: true;
      meeting: BoardVideoMeetingRow;
      participant: BoardVideoParticipantRow;
    }
  | { ok: false; error: string }
> {
  const admin = createSupabaseAdminClient();
  let meeting: BoardVideoMeetingRow | null = null;
  let participant: BoardVideoParticipantRow | null = null;

  if (input.inviteToken) {
    const hash = hashBoardInviteToken(input.inviteToken);
    const { data: part } = await admin
      .from("board_video_meeting_participants")
      .select("*")
      .eq("invite_token_hash", hash)
      .maybeSingle();
    if (!part) return { ok: false, error: "Einladungslink ungültig." };
    participant = part as BoardVideoParticipantRow;
    const { data: m } = await admin
      .from("board_video_meetings")
      .select(BOARD_VIDEO_MEETING_SELECT)
      .eq("id", part.meeting_id)
      .maybeSingle();
    meeting = m as BoardVideoMeetingRow | null;
  } else if (input.slug && input.userId) {
    const { data: m } = await admin
      .from("board_video_meetings")
      .select(BOARD_VIDEO_MEETING_SELECT)
      .eq("slug", input.slug)
      .maybeSingle();
    meeting = m as BoardVideoMeetingRow | null;
    if (meeting) {
      const { data: part } = await admin
        .from("board_video_meeting_participants")
        .select("*")
        .eq("meeting_id", meeting.id)
        .eq("user_id", input.userId)
        .maybeSingle();
      participant = part as BoardVideoParticipantRow | null;
    }
  }

  if (!meeting || !participant) {
    return { ok: false, error: "Kein Zugang zu dieser Besprechung." };
  }

  await syncBoardVideoMeetingLifecycle(admin, meeting);
  const { data: fresh } = await admin
    .from("board_video_meetings")
    .select(BOARD_VIDEO_MEETING_SELECT)
    .eq("id", meeting.id)
    .maybeSingle();
  if (!fresh) return { ok: false, error: "Besprechung nicht gefunden." };

  return {
    ok: true,
    meeting: fresh as BoardVideoMeetingRow,
    participant: participant as BoardVideoParticipantRow,
  };
}
