import { notFound, redirect } from "next/navigation";
import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { BoardMeetingRoom } from "@/components/board-video/board-meeting-room.client";
import { getRequestAuth } from "@/lib/auth/request-auth";
import { resolveBoardMeetingAccess } from "@/app/(app)/admin/besprechung/actions";
import { profileDisplayName } from "@/lib/profiles/display";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function BesprechungSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user } = await getRequestAuth();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/besprechung/${slug}`)}`);
  }

  const access = await resolveBoardMeetingAccess({ slug, userId: user.id });
  if (!access.ok) notFound();

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name,last_name,email,role")
    .eq("id", user.id)
    .maybeSingle();

  const defaultDisplayName =
    access.participant.video_display_name?.trim() ||
    profileDisplayName({
      id: user.id,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      email: profile?.email ?? null,
    });

  return (
    <>
      <Topbar title="Videobesprechung" />
      <main className="px-3 pt-2 sm:px-4">
        <AdminBackLink href="/admin/besprechung" />
      </main>
      <BoardMeetingRoom
        meeting={access.meeting}
        participantId={access.participant.id}
        defaultDisplayName={defaultDisplayName}
        canEndMeeting={profile?.role === "admin"}
      />
    </>
  );
}
