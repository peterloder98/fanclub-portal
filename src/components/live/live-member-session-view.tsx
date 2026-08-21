import Link from "next/link";
import { LiveMemberRoom } from "@/components/live/live-member-room.client";
import { LiveSessionLobby } from "@/components/live/live-session-lobby.client";
import {
  canMembersJoinSession,
  canMembersUseLiveChat,
  isInLiveGracePeriod,
  type LiveSessionRow,
} from "@/lib/live/types";

export type LiveRsvpStatus = "accepted" | "declined" | null;

/**
 * Mitglieder-Ansicht einer Live-Session: Lobby (vor Beitritt) oder Raum.
 * Eingebettet in die App-Shell (`/live`, `/live/[slug]`).
 */
export function LiveMemberSessionView({
  session,
  rsvpStatus,
  variant = "embedded",
}: {
  session: LiveSessionRow;
  rsvpStatus: LiveRsvpStatus;
  /** @deprecated standalone nur noch Fallback; Deep-Links nutzen die App-Shell */
  variant?: "standalone" | "embedded";
}) {
  const joinOpen = canMembersJoinSession(session);
  const inGrace = isInLiveGracePeriod(session);
  const chatOpen = canMembersUseLiveChat(session);
  const showRoom = joinOpen || inGrace || chatOpen;

  const body = showRoom ? (
    <LiveMemberRoom
      slug={session.slug}
      title={session.title}
      sessionId={session.id}
      joinOpen={joinOpen || inGrace}
      status={session.status}
      startsAt={session.starts_at}
      endsAt={session.ends_at}
      graceEndsAt={session.grace_ends_at ?? null}
      rsvpStatus={null}
      showRsvp={false}
      compactHeader={variant === "standalone"}
    />
  ) : (
    <LiveSessionLobby
      sessionId={session.id}
      title={session.title}
      startsAt={session.starts_at}
      endsAt={session.ends_at}
      joinOpensAt={session.join_opens_at}
      rsvpStatus={rsvpStatus}
    />
  );

  if (variant === "embedded") {
    return body;
  }

  return (
    <div className="min-h-dvh bg-[color:var(--background)]">
      <header className="border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-4 py-3 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Live</p>
            <h1 className="truncate text-lg font-semibold tracking-tight">{session.title}</h1>
          </div>
          <Link
            href="/live"
            className="shrink-0 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/25"
          >
            Übersicht
          </Link>
        </div>
      </header>
      {body}
    </div>
  );
}
