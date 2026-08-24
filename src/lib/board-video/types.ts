import { createHash, randomBytes } from "crypto";

export type BoardVideoMeetingStatus = "scheduled" | "live" | "ended" | "cancelled";

export type BoardVideoMeetingRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string;
  join_opens_at: string;
  status: BoardVideoMeetingStatus;
  livekit_room_name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  invites_sent_at?: string | null;
  reminder_sent_at?: string | null;
};

export type BoardVideoParticipantRow = {
  id: string;
  meeting_id: string;
  user_id: string | null;
  email: string;
  is_anni: boolean;
  invite_token_hash: string | null;
  video_display_name: string | null;
  created_at: string;
};

export type BoardVideoAgendaItemRow = {
  id: string;
  meeting_id: string;
  body: string;
  sort_order: number;
  created_by: string | null;
  created_by_name: string;
  updated_by: string | null;
  updated_by_name: string | null;
  checked_at: string | null;
  checked_by: string | null;
  checked_by_name: string | null;
  created_at: string;
  updated_at: string;
};

/** Festes Limit: 1 Stunde ab Start. */
export const BOARD_VIDEO_MEETING_DURATION_MINUTES = 60;
/** Raum (Agenda) öffnet 5 Minuten vor Start. */
export const BOARD_VIDEO_MEETING_JOIN_OPEN_MINUTES = 5;
/** Roter Countdown ab 10 Minuten vor Ende. */
export const BOARD_VIDEO_MEETING_COUNTDOWN_WARN_MINUTES = 10;

export function hashBoardInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateBoardInviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashBoardInviteToken(token) };
}

export function slugifyBoardMeetingTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = randomBytes(3).toString("hex");
  return `${base || "besprechung"}-${suffix}`;
}

export function liveKitRoomNameForBoardMeeting(meetingId: string): string {
  return `board-meeting-${meetingId.replace(/-/g, "").slice(0, 16)}`;
}

export function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    "";
  if (!raw) return "";
  return raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw.replace(/\/$/, "")}`;
}

export function boardMeetingRoomUrl(slug: string): string {
  const base = appBaseUrl();
  const path = `/besprechung/${slug}`;
  return base ? `${base}${path}` : path;
}

export function boardMeetingGuestUrl(token: string): string {
  const base = appBaseUrl();
  const path = `/besprechung/einladung/${encodeURIComponent(token)}`;
  return base ? `${base}${path}` : path;
}

export function boardMeetingEndsAt(startsAtIso: string): string {
  const start = new Date(startsAtIso).getTime();
  if (Number.isNaN(start)) throw new Error("Start: ungültiges Datum.");
  return new Date(start + BOARD_VIDEO_MEETING_DURATION_MINUTES * 60_000).toISOString();
}

export function boardMeetingJoinOpensAt(startsAtIso: string): string {
  const start = new Date(startsAtIso).getTime();
  if (Number.isNaN(start)) throw new Error("Start: ungültiges Datum.");
  return new Date(start - BOARD_VIDEO_MEETING_JOIN_OPEN_MINUTES * 60_000).toISOString();
}

export function boardMeetingVideoOpen(
  joinOpensAtIso: string,
  endsAtIso: string,
  status: BoardVideoMeetingStatus,
  nowMs = Date.now(),
): boolean {
  if (status === "ended" || status === "cancelled") return false;
  const join = new Date(joinOpensAtIso).getTime();
  const end = new Date(endsAtIso).getTime();
  if (Number.isNaN(join) || Number.isNaN(end)) return false;
  return nowMs >= join && nowMs < end;
}

export function boardMeetingAgendaOpen(
  joinOpensAtIso: string,
  endsAtIso: string,
  status: BoardVideoMeetingStatus,
  nowMs = Date.now(),
): boolean {
  if (status === "ended" || status === "cancelled") return false;
  const join = new Date(joinOpensAtIso).getTime();
  const end = new Date(endsAtIso).getTime();
  if (Number.isNaN(join) || Number.isNaN(end)) return false;
  return nowMs >= join && nowMs < end;
}

export function boardMeetingCheckoffOpen(
  joinOpensAtIso: string,
  endsAtIso: string,
  status: BoardVideoMeetingStatus,
  nowMs = Date.now(),
): boolean {
  return boardMeetingVideoOpen(joinOpensAtIso, endsAtIso, status, nowMs);
}
