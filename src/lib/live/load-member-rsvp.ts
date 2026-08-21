import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canMembersJoinSession,
  isInLiveGracePeriod,
  type LiveSessionRow,
} from "@/lib/live/types";
import type { LiveRsvpStatus } from "@/components/live/live-member-session-view";

/** RSVP nur laden, solange die Lobby gilt (kein Join/Nachlauf). */
export async function loadLiveMemberRsvp(
  supabase: SupabaseClient,
  session: LiveSessionRow,
  userId: string,
): Promise<LiveRsvpStatus> {
  if (canMembersJoinSession(session) || isInLiveGracePeriod(session)) {
    return null;
  }
  const { data: rsvp } = await supabase
    .from("live_session_rsvps")
    .select("status")
    .eq("session_id", session.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (rsvp?.status === "accepted" || rsvp?.status === "declined") {
    return rsvp.status;
  }
  return null;
}
