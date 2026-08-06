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

/**
 * Max. geplante Dauer einer Live-Session.
 * LiveKit Cloud (Free/Build) hat kein Zoom-artiges Minuten-Limit pro Call,
 * aber Projekte setzen oft max. 1h Sessiondauer; zudem schonen kürzere
 * Sessions das monatliche Teilnehmer-Minuten-Kontingent.
 */
export const LIVE_SESSION_MAX_DURATION_MS = 60 * 60 * 1000;
export const LIVE_SESSION_MAX_DURATION_LABEL = "60 Minuten";

export function assertLiveSessionDuration(startsAtIso: string, endsAtIso: string): void {
  const start = new Date(startsAtIso).getTime();
  const end = new Date(endsAtIso).getTime();
  if (!(end > start)) {
    throw new Error("Ende muss nach dem Start liegen.");
  }
  if (end - start > LIVE_SESSION_MAX_DURATION_MS) {
    throw new Error(
      `Maximale Dauer: ${LIVE_SESSION_MAX_DURATION_LABEL} (LiveKit-Gratislimit / Schonung des Kontingents).`,
    );
  }
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
