import type { SupabaseClient } from "@supabase/supabase-js";

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

/** Abgelaufene Sessions (ends_at vorbei) → status ended. */
export async function endExpiredLiveSessions(admin: SupabaseClient, now = new Date()) {
  const nowIso = now.toISOString();
  const { data: toEnd, error: endErr } = await admin
    .from("live_sessions")
    .update({ status: "ended", updated_at: nowIso })
    .in("status", ["scheduled", "live"])
    .lt("ends_at", nowIso)
    .select("id");
  if (endErr && !/live_sessions|does not exist/i.test(endErr.message)) {
    throw new Error(endErr.message);
  }
  return toEnd?.length ?? 0;
}

/**
 * 1) Abgelaufene Sessions → status ended
 * 2) Beendete/abgesagte Sessions von gestern und früher löschen
 */
export async function runLiveSessionCleanup(admin: SupabaseClient) {
  const todayStart = startOfTodayBerlinIso();
  const ended = await endExpiredLiveSessions(admin);

  const { data: deleted, error: delErr } = await admin
    .from("live_sessions")
    .delete()
    .in("status", ["ended", "cancelled"])
    .lt("ends_at", todayStart)
    .select("id");

  if (delErr) {
    if (/live_sessions|does not exist/i.test(delErr.message)) {
      return { ended, deleted: 0 };
    }
    throw new Error(delErr.message);
  }

  return {
    ended,
    deleted: deleted?.length ?? 0,
  };
}

/** Einzelne Session beenden, falls ends_at vorbei (für Token-/Chat-Requests). */
export async function endLiveSessionIfPast(
  admin: SupabaseClient,
  session: { id: string; ends_at: string; status: string },
): Promise<boolean> {
  if (session.status === "ended" || session.status === "cancelled") return true;
  if (new Date(session.ends_at).getTime() > Date.now()) return false;
  await admin
    .from("live_sessions")
    .update({ status: "ended", updated_at: new Date().toISOString() })
    .eq("id", session.id)
    .in("status", ["scheduled", "live"]);
  return true;
}
