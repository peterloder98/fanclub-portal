import { createHash, randomBytes } from "crypto";

export type LiveSessionStatus = "scheduled" | "live" | "ended" | "cancelled";

export type LiveSessionRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string;
  join_opens_at: string;
  status: LiveSessionStatus;
  host_token_hash: string;
  livekit_room_name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  invites_sent_at?: string | null;
  anni_reminder_sent_at?: string | null;
};

export const LIVE_SESSION_CHAT_MAX_LEN = 1000;
export const LIVE_SESSION_QUESTION_MAX_LEN = 500;
export const LIVE_SESSION_CHAT_COOLDOWN_MS = 10_000;

/** Sinnvolle Grenzen für die geplante Chat-/Session-Dauer (Minuten). */
export const LIVE_SESSION_MIN_DURATION_MINUTES = 5;
export const LIVE_SESSION_MAX_DURATION_MINUTES = 480;

export function assertLiveSessionDurationMinutes(durationMinutes: number): number {
  const minutes = Math.round(Number(durationMinutes));
  if (!Number.isFinite(minutes) || minutes < LIVE_SESSION_MIN_DURATION_MINUTES) {
    throw new Error(`Dauer: mindestens ${LIVE_SESSION_MIN_DURATION_MINUTES} Minuten.`);
  }
  if (minutes > LIVE_SESSION_MAX_DURATION_MINUTES) {
    throw new Error(`Dauer: höchstens ${LIVE_SESSION_MAX_DURATION_MINUTES} Minuten.`);
  }
  return minutes;
}

export function endsAtFromDuration(startsAtIso: string, durationMinutes: number): string {
  const start = new Date(startsAtIso).getTime();
  if (Number.isNaN(start)) throw new Error("Start: ungültiges Datum.");
  const minutes = assertLiveSessionDurationMinutes(durationMinutes);
  return new Date(start + minutes * 60_000).toISOString();
}

export function liveSessionDurationMinutes(
  startsAtIso: string,
  endsAtIso: string,
): number {
  const start = new Date(startsAtIso).getTime();
  const end = new Date(endsAtIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 60_000);
}

export function hashLiveHostToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateLiveHostToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashLiveHostToken(token) };
}

export function slugifyLiveTitle(title: string): string {
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
  return `${base || "live"}-${suffix}`;
}

export function liveKitRoomNameForSession(sessionId: string): string {
  return `anni-live-${sessionId.replace(/-/g, "").slice(0, 16)}`;
}

export function appBaseUrl(): string {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

export function liveHostUrl(token: string): string {
  const base = appBaseUrl();
  return `${base}/live/host/${encodeURIComponent(token)}`;
}

export function liveMemberUrl(slug: string): string {
  const base = appBaseUrl();
  return `${base}/live/${encodeURIComponent(slug)}`;
}

/** Mitglieder dürfen beitreten: Join-Fenster offen und nicht beendet/abgesagt. */
export function canMembersJoinSession(
  session: Pick<LiveSessionRow, "status" | "join_opens_at" | "ends_at">,
  now = new Date(),
): boolean {
  if (session.status === "ended" || session.status === "cancelled") return false;
  const open = new Date(session.join_opens_at).getTime();
  const end = new Date(session.ends_at).getTime();
  const t = now.getTime();
  return t >= open && t <= end;
}

/** Session für Nav/Dashboard: Join offen oder live, noch nicht vorbei. */
export function isSessionDiscoverable(
  session: Pick<LiveSessionRow, "status" | "join_opens_at" | "ends_at">,
  now = new Date(),
): boolean {
  if (session.status === "cancelled" || session.status === "ended") return false;
  return canMembersJoinSession(session, now) || session.status === "live";
}
