"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BoardMeetingAgenda } from "@/components/board-video/board-meeting-agenda.client";
import {
  boardMeetingAgendaOpen,
  boardMeetingCheckoffOpen,
  boardMeetingVideoOpen,
  type BoardVideoMeetingRow,
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
  const [videoCreds, setVideoCreds] = useState<{ token: string; url: string; endsAt: string } | null>(
    null,
  );
  const [videoError, setVideoError] = useState<string | null>(null);
  const [ended, setEnded] = useState(meeting.status === "ended" || meeting.status === "cancelled");
  const now = Date.now();
  const agendaOpen = boardMeetingAgendaOpen(
    meeting.join_opens_at,
    meeting.ends_at,
    meeting.status,
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

  const connectVideo = useCallback(async () => {
    if (!videoOpen) return;
    setVideoError(null);
    try {
      const res = await fetch("/api/besprechung/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: inviteToken ? undefined : meeting.slug,
          inviteToken,
          displayName: nameSaved,
        }),
      });
      const data = (await res.json()) as {
        token?: string;
        url?: string;
        endsAt?: string;
        error?: string;
      };
      if (!res.ok || !data.token || !data.url) {
        setVideoError(data.error ?? "Video-Zugang fehlgeschlagen.");
        return;
      }
      setVideoCreds({ token: data.token, url: data.url, endsAt: data.endsAt ?? meeting.ends_at });
    } catch {
      setVideoError("Netzwerkfehler beim Video.");
    }
  }, [videoOpen, inviteToken, meeting.slug, meeting.ends_at, nameSaved]);

  useEffect(() => {
    if (videoOpen && nameSaved.trim()) void connectVideo();
  }, [videoOpen, nameSaved, connectVideo]);

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
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)] lg:px-6">
      <div className="min-w-0 space-y-4">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-fc-navy/70">Videobesprechung</p>
          <h1 className="mt-1 text-xl font-semibold text-fc-navy sm:text-2xl">{meeting.title}</h1>
          <p className="mt-1 text-sm text-slate-600">Start {formatBerlinDateTime(meeting.starts_at)}</p>
        </header>

        {videoOpen ? (
          <div className="rounded-2xl border border-fc-navy/10 bg-white p-3 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="grid flex-1 gap-1 text-sm">
                <span className="font-medium text-slate-700">Dein Name im Video</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
                  className="rounded-xl border border-fc-navy/15 px-3 py-2"
                />
              </label>
              <button
                type="button"
                onClick={() => setNameSaved(displayName.trim() || defaultDisplayName)}
                className="h-10 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue"
              >
                Name übernehmen
              </button>
            </div>
            {videoError ? (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {videoError}
                <button type="button" onClick={() => void connectVideo()} className="ml-2 underline">
                  Erneut
                </button>
              </div>
            ) : null}
            {videoCreds ? (
              <BoardMeetingVideoGrid
                token={videoCreds.token}
                serverUrl={videoCreds.url}
                displayName={nameSaved}
                endsAt={videoCreds.endsAt}
                canEndMeeting={canEndMeeting}
                onEnded={() => void handleEnd()}
                onLimitReached={() => void handleEnd()}
              />
            ) : (
              <div className="grid min-h-[12rem] place-items-center rounded-xl bg-slate-900 text-sm text-white/80">
                Verbinde Video…
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            Video startet ab {formatBerlinDateTime(meeting.join_opens_at)} — Agenda könnt ihr schon vorbereiten.
          </div>
        )}
      </div>

      <BoardMeetingAgenda
        meetingId={meeting.id}
        inviteToken={inviteToken}
        checkoffEnabled={checkoffEnabled}
        agendaOpen={agendaOpen}
      />
    </div>
  );
}
