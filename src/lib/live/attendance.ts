import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canMembersJoinSession, type LiveSessionRow } from "@/lib/live/types";
import { POINT_VALUES } from "@/lib/points/values";
import { notifyRankUpIfChanged, sumUserPointsThisYear } from "@/lib/points/rank-notify";
import { assertMemberCanWrite, BROWSE_ONLY_WRITE_BLOCKED_MESSAGE } from "@/lib/portal-launch";
import { isHiddenProfileId } from "@/lib/members/hidden";

export const LIVE_ATTENDANCE_MIN_MS = 60_000;

export async function pingLiveSessionAttendance(sessionId: string): Promise<
  | { ok: true; awarded: boolean; points: number; activeMs: number }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  if (isHiddenProfileId(user.id)) {
    return { ok: true, awarded: false, points: 0, activeMs: 0 };
  }

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (!membership && profile?.role !== "admin") {
    return { ok: false, error: "Nur aktive Mitglieder." };
  }
  try {
    assertMemberCanWrite(profile?.role ?? "member");
  } catch {
    return { ok: false, error: BROWSE_ONLY_WRITE_BLOCKED_MESSAGE };
  }

  const { data: session } = await supabase
    .from("live_sessions")
    .select(
      "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session nicht gefunden." };
  if (!canMembersJoinSession(session as LiveSessionRow)) {
    return { ok: false, error: "Session ist nicht geöffnet." };
  }

  const admin = createSupabaseAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: existing } = await admin
    .from("live_session_attendance")
    .select("first_seen_at,last_seen_at,points_awarded_at")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  let firstSeen = existing?.first_seen_at ? new Date(existing.first_seen_at) : now;
  if (!existing) {
    const { error: insErr } = await admin.from("live_session_attendance").insert({
      session_id: sessionId,
      user_id: user.id,
      first_seen_at: nowIso,
      last_seen_at: nowIso,
    });
    if (insErr && !/duplicate|unique/i.test(insErr.message)) {
      return { ok: false, error: insErr.message };
    }
    if (insErr) {
      const { data: again } = await admin
        .from("live_session_attendance")
        .select("first_seen_at,points_awarded_at")
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (again?.first_seen_at) firstSeen = new Date(again.first_seen_at);
      if (again?.points_awarded_at) {
        return {
          ok: true,
          awarded: false,
          points: POINT_VALUES.liveSessionParticipation,
          activeMs: now.getTime() - firstSeen.getTime(),
        };
      }
    }
  } else {
    await admin
      .from("live_session_attendance")
      .update({ last_seen_at: nowIso })
      .eq("session_id", sessionId)
      .eq("user_id", user.id);
  }

  const activeMs = now.getTime() - firstSeen.getTime();
  if (existing?.points_awarded_at || activeMs < LIVE_ATTENDANCE_MIN_MS) {
    return {
      ok: true,
      awarded: false,
      points: POINT_VALUES.liveSessionParticipation,
      activeMs,
    };
  }

  const points = POINT_VALUES.liveSessionParticipation;
  const pointsBefore = await sumUserPointsThisYear(user.id);
  const { error: ptsErr } = await admin.from("points_transactions").insert({
    user_id: user.id,
    points,
    reason: "live_session_participation",
    entity_type: "live_session",
    entity_id: sessionId,
  });

  if (ptsErr) {
    if (/unique|duplicate/i.test(ptsErr.message)) {
      await admin
        .from("live_session_attendance")
        .update({ points_awarded_at: nowIso, last_seen_at: nowIso })
        .eq("session_id", sessionId)
        .eq("user_id", user.id);
      return { ok: true, awarded: false, points, activeMs };
    }
    return { ok: false, error: ptsErr.message };
  }

  await admin
    .from("live_session_attendance")
    .update({ points_awarded_at: nowIso, last_seen_at: nowIso })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  await notifyRankUpIfChanged(user.id, pointsBefore, pointsBefore + points).catch(console.error);

  return { ok: true, awarded: true, points, activeMs };
}
