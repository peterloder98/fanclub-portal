import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LiveMemberRoom } from "@/components/live/live-member-room.client";
import { LiveSessionLobby } from "@/components/live/live-session-lobby.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canMembersJoinSession, type LiveSessionRow } from "@/lib/live/types";

export const dynamic = "force-dynamic";

/**
 * Mitglieder-Live außerhalb der App-Shell.
 * Vor dem Beitritt: Infos + RSVP + eine Vorab-Frage.
 * Ab Beitrittsfenster: Video + Chat.
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

  const { data: session, error: sessionError } = await supabase
    .from("live_sessions")
    .select(
      "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (sessionError) {
    console.error("[live] session load", sessionError.message);
  }
  if (!session) notFound();

  const row = session as LiveSessionRow;
  const joinOpen = canMembersJoinSession(row);
  const ended = row.status === "ended" || row.status === "cancelled";

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
  if (!joinOpen && !ended) {
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

      {ended ? (
        <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-slate-600">
          Diese Live-Session ist beendet
          {row.status === "cancelled" ? " bzw. abgesagt" : ""}.
        </div>
      ) : joinOpen ? (
        <LiveMemberRoom
          slug={row.slug}
          title={row.title}
          sessionId={row.id}
          joinOpen
          status={row.status}
          startsAt={row.starts_at}
          endsAt={row.ends_at}
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
