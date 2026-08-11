import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LiveMemberRoom } from "@/components/live/live-member-room.client";
import { LiveSessionLobby } from "@/components/live/live-session-lobby.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  canMembersJoinSession,
  canMembersUseLiveChat,
  isInLiveGracePeriod,
  type LiveSessionRow,
} from "@/lib/live/types";
import { syncLiveSessionLifecycle } from "@/lib/live/cleanup";

export const dynamic = "force-dynamic";

const SESSION_COLS =
  "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at,grace_ends_at";

/**
 * Mitglieder-Live außerhalb der App-Shell.
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
      .select(SESSION_COLS)
      .eq("id", (session as LiveSessionRow).id)
      .maybeSingle();
    if (refreshed.data) session = refreshed.data as typeof session;
  }

  if (!session) redirect("/live");

  const row = session as LiveSessionRow;
  const joinOpen = canMembersJoinSession(row);
  const inGrace = isInLiveGracePeriod(row);
  const chatOpen = canMembersUseLiveChat(row);

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

  let rsvpStatus: "accepted" | "declined" | null = null;
  if (!joinOpen && !inGrace) {
    const { data: rsvp } = await supabase
      .from("live_session_rsvps")
      .select("status")
      .eq("session_id", row.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (rsvp?.status === "accepted" || rsvp?.status === "declined") {
      rsvpStatus = rsvp.status;
    }
  }

  return (
    <div className="min-h-dvh bg-[color:var(--background)]">
      <header className="border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-4 py-3 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Live</p>
            <h1 className="truncate text-lg font-semibold tracking-tight">{row.title}</h1>
          </div>
          <Link
            href="/live"
            className="shrink-0 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/25"
          >
            Zurück
          </Link>
        </div>
      </header>

      {joinOpen || inGrace || chatOpen ? (
        <LiveMemberRoom
          slug={row.slug}
          title={row.title}
          sessionId={row.id}
          joinOpen={joinOpen || inGrace}
          status={row.status}
          startsAt={row.starts_at}
          endsAt={row.ends_at}
          graceEndsAt={row.grace_ends_at ?? null}
          rsvpStatus={null}
          showRsvp={false}
          compactHeader
        />
      ) : (
        <LiveSessionLobby
          sessionId={row.id}
          title={row.title}
          startsAt={row.starts_at}
          endsAt={row.ends_at}
          joinOpensAt={row.join_opens_at}
          rsvpStatus={rsvpStatus}
        />
      )}
    </div>
  );
}
