import type { SupabaseClient } from "@supabase/supabase-js";
import {
  graceEndsAtIso,
  isInLiveGracePeriod,
  type LiveSessionRow,
} from "@/lib/live/types";

const SESSION_SELECT =
  "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at,grace_ends_at,invites_sent_at,anni_reminder_sent_at";

/** Mitternacht heute (Europe/Berlin) als UTC-ISO. */
export function startOfTodayBerlinIso(now = new Date()): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const base = Date.parse(`${day}T00:00:00.000Z`);
  for (let deltaH = -14; deltaH <= 14; deltaH++) {
    const t = new Date(base + deltaH * 3_600_000);
    const local = t.toLocaleString("sv-SE", { timeZone: "Europe/Berlin" });
    if (local === `${day} 00:00:00`) return t.toISOString();
  }
  return new Date(`${day}T00:00:00+01:00`).toISOString();
}

/** Geplantes oder vorzeitiges Ende → status ended + 10-Min-Nachlauf für Chat. */
export async function beginLiveSessionGrace(
  admin: SupabaseClient,
  sessionId: string,
  now = new Date(),
): Promise<string> {
  const nowIso = now.toISOString();
  const grace = graceEndsAtIso(now);
  const { error } = await admin
    .from("live_sessions")
    .update({
      status: "ended",
      grace_ends_at: grace,
      updated_at: nowIso,
    })
    .eq("id", sessionId)
    .in("status", ["scheduled", "live"]);
  if (error && !/grace_ends_at/i.test(error.message)) {
    throw new Error(error.message);
  }
  if (error && /grace_ends_at/i.test(error.message)) {
    // Spalte fehlt noch — zumindest beenden
    await admin
      .from("live_sessions")
      .update({ status: "ended", updated_at: nowIso })
      .eq("id", sessionId)
      .in("status", ["scheduled", "live"]);
  }
  return grace;
}

/** Abgelaufene Sessions (ends_at vorbei) → Grace starten. */
export async function endExpiredLiveSessions(admin: SupabaseClient, now = new Date()) {
  const nowIso = now.toISOString();
  const grace = graceEndsAtIso(now);
  const { data: toEnd, error: endErr } = await admin
    .from("live_sessions")
    .update({
      status: "ended",
      grace_ends_at: grace,
      updated_at: nowIso,
    })
    .in("status", ["scheduled", "live"])
    .lt("ends_at", nowIso)
    .select("id");

  if (endErr) {
    if (/live_sessions|does not exist/i.test(endErr.message)) return 0;
    if (/grace_ends_at/i.test(endErr.message)) {
      const fallback = await admin
        .from("live_sessions")
        .update({ status: "ended", updated_at: nowIso })
        .in("status", ["scheduled", "live"])
        .lt("ends_at", nowIso)
        .select("id");
      if (fallback.error && !/live_sessions|does not exist/i.test(fallback.error.message)) {
        throw new Error(fallback.error.message);
      }
      return fallback.data?.length ?? 0;
    }
    throw new Error(endErr.message);
  }
  return toEnd?.length ?? 0;
}

/** Nachlauf vorbei → Session sofort löschen (zurück auf „nichts geplant“). */
export async function deleteGraceExpiredLiveSessions(
  admin: SupabaseClient,
  now = new Date(),
) {
  const nowIso = now.toISOString();

  const withGrace = await admin
    .from("live_sessions")
    .delete()
    .in("status", ["ended", "cancelled"])
    .not("grace_ends_at", "is", null)
    .lt("grace_ends_at", nowIso)
    .select("id");

  if (withGrace.error) {
    if (/live_sessions|does not exist|grace_ends_at/i.test(withGrace.error.message)) {
      /* Spalte fehlt oder Tabelle — Fallback unten */
    } else {
      throw new Error(withGrace.error.message);
    }
  }

  // Ohne Grace-Zeitstempel (Altbestand / Abbruch): sofort löschen wenn ended/cancelled
  const withoutGrace = await admin
    .from("live_sessions")
    .delete()
    .in("status", ["ended", "cancelled"])
    .is("grace_ends_at", null)
    .select("id");

  if (withoutGrace.error && !/live_sessions|does not exist|grace_ends_at/i.test(withoutGrace.error.message)) {
    throw new Error(withoutGrace.error.message);
  }

  return (withGrace.data?.length ?? 0) + (withoutGrace.data?.length ?? 0);
}

/**
 * 1) Abgelaufene Sessions → Grace (Chat noch 10 Min.)
 * 2) Grace vorbei / Altbestand ended → sofort löschen
 */
export async function runLiveSessionCleanup(admin: SupabaseClient) {
  const ended = await endExpiredLiveSessions(admin);
  const deleted = await deleteGraceExpiredLiveSessions(admin);
  return { ended, deleted };
}

/**
 * Lifecycle für Token-/Chat-Requests.
 * - ends_at vorbei → Grace starten
 * - Grace vorbei → löschen, return "gone"
 * - in Grace → "grace"
 * - sonst "active"
 */
export async function syncLiveSessionLifecycle(
  admin: SupabaseClient,
  session: Pick<
    LiveSessionRow,
    "id" | "ends_at" | "status" | "grace_ends_at"
  >,
): Promise<"active" | "grace" | "gone"> {
  if (session.status === "cancelled") {
    await admin.from("live_sessions").delete().eq("id", session.id);
    return "gone";
  }

  if (session.status === "ended") {
    if (isInLiveGracePeriod(session)) return "grace";
    await admin.from("live_sessions").delete().eq("id", session.id);
    return "gone";
  }

  if (new Date(session.ends_at).getTime() <= Date.now()) {
    const grace = await beginLiveSessionGrace(admin, session.id);
    return grace ? "grace" : "gone";
  }

  return "active";
}

/** @deprecated Alias — Video/Host stoppen wenn nicht mehr aktiv. */
export async function endLiveSessionIfPast(
  admin: SupabaseClient,
  session: { id: string; ends_at: string; status: string; grace_ends_at?: string | null },
): Promise<boolean> {
  const phase = await syncLiveSessionLifecycle(admin, session as LiveSessionRow);
  return phase !== "active";
}

export { SESSION_SELECT as LIVE_SESSION_SELECT };
