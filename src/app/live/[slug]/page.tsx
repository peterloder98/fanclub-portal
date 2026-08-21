import { notFound, redirect } from "next/navigation";
import { LiveMemberSessionView } from "@/components/live/live-member-session-view";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type LiveSessionRow } from "@/lib/live/types";
import { syncLiveSessionLifecycle, LIVE_SESSION_SELECT } from "@/lib/live/cleanup";
import { loadLiveMemberRsvp } from "@/lib/live/load-member-rsvp";

export const dynamic = "force-dynamic";

const SESSION_COLS =
  "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at,grace_ends_at";

/**
 * Mitglieder-Live außerhalb der App-Shell (Deep-Link aus E-Mail/ICS).
 * Vor dem Beitritt: Infos + RSVP + eine Vorab-Frage.
 * Ab Beitrittsfenster: Video + Chat.
 * Nach Ende: 10-Min-Chat-Nachlauf, dann Session weg.
 */
export default async function LiveMemberPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/live/${slug}`)}`);
  }

  let { data: session, error: sessionError } = await supabase
    .from("live_sessions")
    .select(SESSION_COLS)
    .eq("slug", slug)
    .maybeSingle();

  if (sessionError && /grace_ends_at/i.test(sessionError.message)) {
    const fallback = await supabase
      .from("live_sessions")
      .select(
        "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
      )
      .eq("slug", slug)
      .maybeSingle();
    session = fallback.data
      ? ({ ...fallback.data, grace_ends_at: null } as typeof session)
      : null;
    sessionError = fallback.error;
  }

  if (sessionError) {
    console.error("[live] session load", sessionError.message);
  }
  if (!session) notFound();

  const admin = createSupabaseAdminClient();
  const phase = await syncLiveSessionLifecycle(admin, session as LiveSessionRow);
  if (phase === "gone") {
    redirect("/live");
  }

  if (phase === "grace" || phase === "active") {
    const refreshed = await admin
      .from("live_sessions")
      .select(LIVE_SESSION_SELECT)
      .eq("id", (session as LiveSessionRow).id)
      .maybeSingle();
    if (refreshed.data) session = refreshed.data as typeof session;
  }

  if (!session) redirect("/live");

  const row = session as LiveSessionRow;

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
    redirect("/mitgliedschaft/ausstehend");
  }

  const rsvpStatus = await loadLiveMemberRsvp(supabase, row, user.id);

  return <LiveMemberSessionView session={row} rsvpStatus={rsvpStatus} variant="standalone" />;
}
