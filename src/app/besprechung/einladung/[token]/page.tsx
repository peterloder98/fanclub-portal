import { notFound } from "next/navigation";
import { BoardMeetingRoom } from "@/components/board-video/board-meeting-room.client";
import { resolveBoardMeetingAccess } from "@/app/(app)/admin/besprechung/actions";

export const dynamic = "force-dynamic";

export default async function BesprechungGuestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = decodeURIComponent(token);
  const access = await resolveBoardMeetingAccess({ inviteToken: decoded });
  if (!access.ok) notFound();

  const defaultDisplayName =
    access.participant.video_display_name?.trim() ||
    (access.participant.is_anni ? "Anni" : "Gast");

  return (
    <div className="min-h-dvh bg-fc-ice">
      <header className="border-b border-fc-navy/10 bg-white px-4 py-3">
        <p className="text-sm font-semibold text-fc-navy">Videobesprechung mit dem Vorstand</p>
      </header>
      <BoardMeetingRoom
        meeting={access.meeting}
        participantId={access.participant.id}
        inviteToken={decoded}
        defaultDisplayName={defaultDisplayName}
        canEndMeeting={false}
      />
    </div>
  );
}
