import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type BoardVideoMeetingRow,
  type BoardVideoMeetingStatus,
  BOARD_VIDEO_MEETING_DURATION_MINUTES,
} from "@/lib/board-video/types";
import { deleteLiveKitRoom } from "@/lib/live/livekit";

export const BOARD_VIDEO_MEETING_SELECT =
  "id,slug,title,starts_at,ends_at,join_opens_at,status,livekit_room_name,created_by,created_at,updated_at,invites_sent_at,reminder_sent_at";

export async function syncBoardVideoMeetingLifecycle(
  admin: SupabaseClient,
  meeting: Pick<BoardVideoMeetingRow, "id" | "ends_at" | "status" | "livekit_room_name">,
  nowMs = Date.now(),
): Promise<BoardVideoMeetingStatus> {
  const endMs = new Date(meeting.ends_at).getTime();
  if (meeting.status === "cancelled") return "cancelled";
  if (meeting.status === "ended") return "ended";
  if (!Number.isNaN(endMs) && nowMs >= endMs) {
    await admin
      .from("board_video_meetings")
      .update({ status: "ended", updated_at: new Date().toISOString() })
      .eq("id", meeting.id)
      .neq("status", "ended");
    await deleteLiveKitRoom(meeting.livekit_room_name);
    return "ended";
  }
  return meeting.status;
}

export function boardMeetingRemainingMs(endsAtIso: string, nowMs = Date.now()): number {
  const end = new Date(endsAtIso).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - nowMs);
}

export function boardMeetingHardLimitLabel(): string {
  return `${BOARD_VIDEO_MEETING_DURATION_MINUTES} Minuten`;
}
