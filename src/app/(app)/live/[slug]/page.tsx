import { notFound } from "next/navigation";
import { Topbar } from "@/components/app-shell/topbar";
import { LiveMemberRoom } from "@/components/live/live-member-room.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canMembersJoinSession, type LiveSessionRow } from "@/lib/live/types";

export const dynamic = "force-dynamic";

export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("live_sessions")
    .select(
      "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!session) notFound();
  const row = session as LiveSessionRow;
  const joinOpen = canMembersJoinSession(row);

  let rsvpStatus: "accepted" | "declined" | null = null;
  if (user) {
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
    <div className="min-h-screen">
      <Topbar title="Live" subtitle={row.title} />
      <LiveMemberRoom
        slug={row.slug}
        title={row.title}
        sessionId={row.id}
        joinOpen={joinOpen}
        status={row.status}
        startsAt={row.starts_at}
        endsAt={row.ends_at}
        rsvpStatus={rsvpStatus}
        showRsvp={row.status !== "ended" && row.status !== "cancelled"}
      />
    </div>
  );
}
