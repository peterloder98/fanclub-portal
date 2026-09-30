"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BoardMeetingAgenda } from "@/components/board-video/board-meeting-agenda.client";
import { BoardMeetingPrejoin } from "@/components/board-video/board-meeting-prejoin.client";
import {
  boardMeetingAgendaOpen,
  boardMeetingAgendaWritable,
  boardMeetingCheckoffOpen,
  boardMeetingVideoOpen,
  type BoardVideoMeetingRow,
  type BoardVideoSeatRosterItem,
} from "@/lib/board-video/types";
import { formatBerlinDateTime } from "@/lib/datetime/berlin";

const BoardMeetingVideoGrid = dynamic(
  () =>
    import("@/components/board-video/board-meeting-video-grid.client").then(
      (m) => m.BoardMeetingVideoGrid,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[12rem] place-items-center rounded-xl bg-slate-900 text-sm text-white/80">
        Video wird geladen…
      </div>
    ),
  },
);

export function BoardMeetingRoom({
  meeting,
  participantId,
  inviteToken,
  defaultDisplayName,
  canEndMeeting,
}: {
  meeting: BoardVideoMeetingRow;
  participantId: string;
  inviteToken?: string;
  defaultDisplayName: string;
  canEndMeeting: boolean;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [nameSaved, setNameSaved] = useState(defaultDisplayName);
  const [initialCamOn, setInitialCamOn] = useState(true);
  const [initialMicOn, setInitialMicOn] = useState(true);
  const [joining, setJoining] = useState(false);
  const [videoCreds, setVideoCreds] = useState<{
    token: string;
    url: string;
    endsAt: string;
    roster: BoardVideoSeatRosterItem[];
  } | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [ended, setEnded] = useState(meeting.status === "ended" || meeting.status === "cancelled");
  const [now, setNow] = useState(() => Date.now());
  const isBoardAdmin = !inviteToken;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const agendaOpen = boardMeetingAgendaOpen(
    meeting.join_opens_at,
    meeting.ends_at,
    meeting.status,
    now,
  );
  const canEditAgenda = boardMeetingAgendaWritable(
    meeting.join_opens_at,
    meeting.ends_at,
    meeting.status,
    { isBoardAdmin },
    now,
  );
  const videoOpen =
    !ended &&
    boardMeetingVideoOpen(meeting.join_opens_at, meeting.ends_at, meeting.status, now);
  const checkoffEnabled = boardMeetingCheckoffOpen(
    meeting.join_opens_at,
    meeting.ends_at,
    meeting.status,
    now,
  );

  const connectVideo = useCallback(
    async (opts: { displayName: string; camOn: boolean; micOn: boolean }) => {
      if (!videoOpen) return;
      const name = opts.displayName.trim() || defaultDisplayName;
      setJoining(true);
      setVideoError(null);
      setNameSaved(name);
      setDisplayName(name);
      setInitialCamOn(opts.camOn);
      setInitialMicOn(opts.micOn);
      try {
        const res = await fetch("/api/besprechung/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: inviteToken ? undefined : meeting.slug,
            inviteToken,
            displayName: name,
          }),
        });
        const data = (await res.json()) as {
          token?: string;
          url?: string;
          endsAt?: string;
          roster?: BoardVideoSeatRosterItem[];
          error?: string;
        };
        if (!res.ok || !data.token || !data.url) {
          setVideoError(data.error ?? "Video-Zugang fehlgeschlagen.");
          return;
        }
        setVideoCreds({
          token: data.token,
          url: data.url,
          endsAt: data.endsAt ?? meeting.ends_at,
          roster: data.roster ?? [],
        });
      } catch {
        setVideoError("Netzwerkfehler beim Video.");
      } finally {
        setJoining(false);
      }
    },
    [videoOpen, inviteToken, meeting.slug, meeting.ends_at, defaultDisplayName],
  );

  async function handleEnd() {
    if (canEndMeeting) {
      await fetch("/api/besprechung/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: meeting.id }),
      });
    }
    setEnded(true);
    setVideoCreds(null);
    router.refresh();
  }

  if (ended || new Date(meeting.ends_at).getTime() <= Date.now()) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-700">
        Die Videobesprechung ist beendet.
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-3 px-3 py-3 sm:px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] lg:items-start lg:gap-4 lg:px-4 xl:px-6">
      <div className="min-w-0">
        {videoOpen ? (
          videoCreds ? (
            <div className="rounded-2xl border border-fc-navy/10 bg-white p-3 shadow-sm">
              <BoardMeetingVideoGrid
                token={videoCreds.token}
                serverUrl={videoCreds.url}
                displayName={nameSaved}
                endsAt={videoCreds.endsAt}
                canEndMeeting={canEndMeeting}
                roster={videoCreds.roster}
                initialCamOn={initialCamOn}
                initialMicOn={initialMicOn}
                onEnded={() => void handleEnd()}
                onLimitReached={() => void handleEnd()}
                nameDraft={displayName}
                onNameDraftChange={setDisplayName}
                onNameCommit={() => setNameSaved(displayName.trim() || defaultDisplayName)}
              />
            </div>
          ) : (
            <BoardMeetingPrejoin
              defaultDisplayName={defaultDisplayName}
              joining={joining}
              error={videoError}
              onJoin={(opts) => void connectVideo(opts)}
            />
          )
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            Video startet ab {formatBerlinDateTime(meeting.join_opens_at)}. Agenda-Punkte könnt ihr
            {isBoardAdmin ? " schon jetzt " : " ab 5 Minuten vor Start "}
            eintragen.
          </div>
        )}
      </div>

      <div className="min-w-0 w-full lg:max-w-[16rem]">
        <BoardMeetingAgenda
          meetingId={meeting.id}
          inviteToken={inviteToken}
          checkoffEnabled={checkoffEnabled}
          agendaOpen={agendaOpen}
          canEdit={canEditAgenda}
        />
      </div>
    </div>
  );
}
