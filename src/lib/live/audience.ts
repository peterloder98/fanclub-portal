import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canMembersUseLiveChat, type LiveSessionRow } from "@/lib/live/types";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { excludeHiddenProfiles, isHiddenProfileId } from "@/lib/members/hidden";
import { profileDisplayName } from "@/lib/profiles/display";

/** Heartbeat alle 30 s — wer zuletzt länger her ist, gilt als offline. */
export const LIVE_AUDIENCE_ONLINE_MS = 90_000;

export type LiveAudienceMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export async function loadLiveSessionAudience(sessionId: string): Promise<
  | { ok: true; count: number; members: LiveAudienceMember[] }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

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

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id,join_opens_at,ends_at,status,grace_ends_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session nicht gefunden." };

  const sessionRow = session as LiveSessionRow;
  if (!canMembersUseLiveChat(sessionRow)) {
    return { ok: false, error: "Session ist nicht geöffnet." };
  }

  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - LIVE_AUDIENCE_ONLINE_MS).toISOString();
  const { data: rows, error } = await admin
    .from("live_session_attendance")
    .select("user_id,last_seen_at")
    .eq("session_id", sessionId)
    .gte("last_seen_at", since)
    .order("last_seen_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  const ids = [...new Set((rows ?? []).map((r) => r.user_id))].filter(
    (id) => !isHiddenProfileId(id),
  );
  if (!ids.length) {
    return { ok: true, count: 0, members: [] };
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,first_name,last_name,email,avatar_path,updated_at,is_hidden")
    .in("id", ids);

  const members = excludeHiddenProfiles(profiles ?? []).map((p) => ({
    id: p.id,
    name: profileDisplayName({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
    }),
    avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
  }));

  members.sort((a, b) => a.name.localeCompare(b.name, "de"));

  return { ok: true, count: members.length, members };
}
