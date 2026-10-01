import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type BoardVideoMeetingRow,
  type BoardVideoMeetingStatus,
  BOARD_VIDEO_MEETING_DURATION_MINUTES,
} from "@/lib/board-video/types";

export const BOARD_VIDEO_MEETING_SELECT =
  "id,slug,title,starts_at,ends_at,join_opens_at,status,livekit_room_name,created_by,created_at,updated_at,invites_sent_at,reminder_sent_at";

/**
 * Lifecycle-Sync: geplante ends_at beendet den Call NICHT mehr.
 * Beenden nur manuell (Host) oder per Admin-Aktion — LiveKit-Raum bleibt bis dahin.
 */
export async function syncBoardVideoMeetingLifecycle(
  _admin: SupabaseClient,
  meeting: Pick<BoardVideoMeetingRow, "id" | "ends_at" | "status" | "livekit_room_name">,
  _nowMs = Date.now(),
): Promise<BoardVideoMeetingStatus> {
  if (meeting.status === "cancelled") return "cancelled";
  if (meeting.status === "ended") return "ended";
  return meeting.status;
}

/** Verbleibende Zeit bis zur geplanten Dauer (0 wenn überschritten). Nur Orientierung. */
export function boardMeetingRemainingMs(endsAtIso: string, nowMs = Date.now()): number {
  const end = new Date(endsAtIso).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - nowMs);
}

export function boardMeetingPlannedDurationLabel(): string {
  return `${BOARD_VIDEO_MEETING_DURATION_MINUTES} Minuten (Orientierung)`;
}

/** @deprecated Use boardMeetingPlannedDurationLabel — planned duration is soft only. */
export function boardMeetingHardLimitLabel(): string {
  return boardMeetingPlannedDurationLabel();
}
