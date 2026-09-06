import { BoardMeetingRoom } from "@/components/board-video/board-meeting-room.client";
import { resolveBoardMeetingAccess } from "@/app/(app)/admin/besprechung/actions";

export const dynamic = "force-dynamic";

function GuestLinkError({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-h-dvh bg-fc-ice">
      <header className="border-b border-fc-navy/10 bg-white px-4 py-3">
        <p className="text-sm font-semibold text-fc-navy">Videobesprechung mit dem Vorstand</p>
      </header>
      <main className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-amber-950">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed">{text}</p>
        </div>
      </main>
    </div>
  );
}

export default async function BesprechungGuestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = decodeURIComponent(token);
  const access = await resolveBoardMeetingAccess({ inviteToken: decoded });
  if (!access.ok) {
    return (
      <GuestLinkError
        title="Einladungslink ungültig"
        text="Dieser Link gehört nicht zu einer aktuellen Einladung oder wurde durch einen neuen Versand ersetzt. Bitte den Vorstand um einen neuen Einladungslink bitten. Der neue Link bleibt bis zum Ende der Besprechung gültig — auch wenn du ihn mehrfach oder auf einem anderen Gerät öffnest."
      />
    );
  }

  if (access.meeting.status === "ended" || access.meeting.status === "cancelled") {
    return (
      <GuestLinkError
        title="Besprechung beendet"
        text="Diese Videobesprechung ist bereits beendet. Ein neuer Link ist nicht nötig."
      />
    );
  }

  const defaultDisplayName =
    access.participant.video_display_name?.trim() ||
    (access.participant.is_anni ? "Anni" : "Gast");

  return (
    <div className="min-h-dvh bg-fc-ice">
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
