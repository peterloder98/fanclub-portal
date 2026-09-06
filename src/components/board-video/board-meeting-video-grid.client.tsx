"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type LocalParticipant,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type LocalTrackPublication,
} from "livekit-client";
import { Mic, MicOff, MonitorUp, Pin, PinOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/cn";
import type { BoardVideoSeatRosterItem } from "@/lib/board-video/types";

const ANNI_PLACEHOLDER = "__anni_seat__";

type ParticipantTile = {
  id: string;
  name: string;
  isLocal: boolean;
  isAnni: boolean;
  videoTrack: RemoteTrack | null;
  audioTrack: RemoteTrack | null;
  screenTrack: RemoteTrack | null;
};

type SeatSlot = {
  identity: string;
  name: string;
  isAnni: boolean;
  tile: ParticipantTile | null;
};

function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-2 lg:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
}

function participantIsAnni(
  p: RemoteParticipant | LocalParticipant,
  roster: BoardVideoSeatRosterItem[],
): boolean {
  const fromRoster = roster.find((r) => r.identity === p.identity);
  if (fromRoster) return fromRoster.isAnni;
  try {
    const meta = JSON.parse(p.metadata || "{}") as { isAnni?: boolean };
    return meta.isAnni === true;
  } catch {
    return false;
  }
}

function ensureSeatOrder(
  order: string[],
  items: Array<{ identity: string; isAnni: boolean }>,
): string[] {
  const next = [...order];
  if (next.length === 0) {
    const anni = items.find((i) => i.isAnni);
    const others = items
      .filter((i) => !i.isAnni)
      .slice()
      .sort((a, b) => a.identity.localeCompare(b.identity));
    next.push(anni?.identity ?? ANNI_PLACEHOLDER);
    for (const o of others) next.push(o.identity);
    return next;
  }
  for (const item of items) {
    if (item.isAnni) {
      const idx = next.indexOf(item.identity);
      if (idx > 0) next.splice(idx, 1);
      if (next[0] === ANNI_PLACEHOLDER || next[0] !== item.identity) {
        next[0] = item.identity;
      }
      continue;
    }
    if (!next.includes(item.identity)) next.push(item.identity);
  }
  return next;
}

export function BoardMeetingVideoGrid({
  token,
  serverUrl,
  displayName,
  endsAt,
  canEndMeeting,
  roster,
  onEnded,
  onLimitReached,
  nameDraft,
  onNameDraftChange,
  onNameCommit,
}: {
  token: string;
  serverUrl: string;
  displayName: string;
  endsAt: string;
  canEndMeeting: boolean;
  roster: BoardVideoSeatRosterItem[];
  onEnded: () => void;
  onLimitReached: () => void;
  nameDraft: string;
  onNameDraftChange: (value: string) => void;
  onNameCommit: () => void;
}) {
  const roomRef = useRef<Room | null>(null);
  const seatOrderRef = useRef<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [seats, setSeats] = useState<SeatSlot[]>([]);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(endsAt).getTime() - Date.now()),
  );
  const endedRef = useRef(false);
  const rosterRef = useRef(roster);
  rosterRef.current = roster;

  const rebuildSeats = useCallback((room: Room) => {
    const rosterNow = rosterRef.current;
    const tiles: ParticipantTile[] = [
      participantToTile(room.localParticipant, true, rosterNow),
    ];
    room.remoteParticipants.forEach((p) => tiles.push(participantToTile(p, false, rosterNow)));
    const known = [
      ...rosterNow,
      ...tiles.map((t) => ({ identity: t.id, isAnni: t.isAnni, name: t.name })),
    ];
    seatOrderRef.current = ensureSeatOrder(seatOrderRef.current, known);
    const byId = new Map(tiles.map((t) => [t.id, t]));
    const nextSeats: SeatSlot[] = seatOrderRef.current.map((identity) => {
      const tile = byId.get(identity) ?? null;
      const fromRoster = rosterNow.find((r) => r.identity === identity);
      const isAnni = identity === ANNI_PLACEHOLDER || Boolean(fromRoster?.isAnni) || Boolean(tile?.isAnni);
      return {
        identity,
        name: tile?.name || fromRoster?.name || (isAnni ? "Anni" : "Teilnehmer"),
        isAnni,
        tile,
      };
    });
    setSeats(nextSeats);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    const onAnyChange = () => {
      if (!cancelled) rebuildSeats(room);
    };
    room.on(RoomEvent.TrackSubscribed, onAnyChange);
    room.on(RoomEvent.TrackUnsubscribed, onAnyChange);
    room.on(RoomEvent.ParticipantConnected, onAnyChange);
    room.on(RoomEvent.ParticipantDisconnected, onAnyChange);
    room.on(RoomEvent.LocalTrackPublished, onAnyChange);
    room.on(RoomEvent.LocalTrackUnpublished, onAnyChange);
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setActiveSpeakers(speakers.map((s) => s.identity));
    });
    room.on(RoomEvent.Disconnected, () => setConnected(false));
    void (async () => {
      try {
        await room.connect(serverUrl, token);
        if (cancelled) return;
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        setConnected(true);
        rebuildSeats(room);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Verbindung fehlgeschlagen.");
      }
    })();
    return () => {
      cancelled = true;
      void room.disconnect();
    };
  }, [token, serverUrl, displayName, rebuildSeats]);

  useEffect(() => {
    const room = roomRef.current;
    if (room && connected) rebuildSeats(room);
  }, [roster, connected, rebuildSeats]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
      setRemainingMs(ms);
      if (ms <= 0 && !endedRef.current) {
        endedRef.current = true;
        onLimitReached();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAt, onLimitReached]);

  const screenTile = seats.find((s) => s.tile?.screenTrack)?.tile ?? null;
  const warn = remainingMs > 0 && remainingMs <= 10 * 60_000;
  const urgent = remainingMs > 0 && remainingMs <= 60_000;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums",
          remainingMs <= 0 && "border-slate-300 bg-slate-100 text-slate-700",
          urgent && remainingMs > 0 && "animate-pulse border-rose-400 bg-rose-50 text-rose-800",
          warn && !urgent && remainingMs > 0 && "border-amber-300 bg-amber-50 text-amber-950",
          !warn && remainingMs > 0 && "border-fc-navy/15 bg-white text-fc-navy",
        )}
        role="timer"
      >
        {remainingMs <= 0
          ? "Zeitlimit erreicht — Besprechung endet"
          : `Noch ${formatRemain(remainingMs)} (max. 1 Stunde)`}
      </div>
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {screenTile?.screenTrack ? (
        <div className="relative min-h-[12rem] overflow-hidden rounded-xl bg-black sm:min-h-[16rem]">
          <ScreenVideo track={screenTile.screenTrack} />
          <p className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
            Bildschirm · {screenTile.name}
          </p>
        </div>
      ) : null}
      <div className={cn("grid min-h-0 flex-1 auto-rows-fr gap-2", gridClass(Math.max(1, seats.length)))}>
        {seats.map((seat) => (
          <ParticipantCard
            key={seat.identity}
            seat={seat}
            speaking={Boolean(seat.tile && activeSpeakers.includes(seat.tile.id))}
            pinned={pinnedId === seat.identity}
            onPin={
              seat.tile && !seat.tile.isLocal
                ? () => setPinnedId((prev) => (prev === seat.identity ? null : seat.identity))
                : undefined
            }
          />
        ))}
      </div>
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ControlBtn onClick={() => void toggleMedia(roomRef, "cam", camOn, setCamOn)} active={camOn} label="Kamera">
            {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </ControlBtn>
          <ControlBtn onClick={() => void toggleMedia(roomRef, "mic", micOn, setMicOn)} active={micOn} label="Mikro">
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </ControlBtn>
          <ControlBtn
            onClick={() => void toggleScreenShare(roomRef, screenOn, setScreenOn)}
            active={!screenOn}
            label="Bildschirm"
          >
            <MonitorUp className="h-4 w-4" />
          </ControlBtn>
          {canEndMeeting ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Videobesprechung für alle beenden?")) onEnded();
              }}
              className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Besprechung beenden
            </button>
          ) : null}
          {!connected ? <span className="text-xs text-slate-500">Verbinde…</span> : null}
        </div>
        <div className="flex w-full max-w-md items-center gap-2">
          <input
            value={nameDraft}
            onChange={(e) => onNameDraftChange(e.target.value.slice(0, 40))}
            aria-label="Name im Video"
            className="h-9 min-w-0 flex-1 rounded-lg border border-fc-navy/15 px-2 text-xs"
          />
          <button
            type="button"
            onClick={onNameCommit}
            className="h-9 shrink-0 rounded-lg border border-fc-navy/15 px-3 text-xs font-semibold text-fc-navy hover:bg-fc-ice"
          >
            Name
          </button>
        </div>
      </div>
    </div>
  );
}

async function toggleMedia(
  roomRef: React.RefObject<Room | null>,
  kind: "cam" | "mic",
  current: boolean,
  set: (v: boolean) => void,
) {
  const room = roomRef.current;
  if (!room) return;
  const next = !current;
  if (kind === "cam") await room.localParticipant.setCameraEnabled(next);
  else await room.localParticipant.setMicrophoneEnabled(next);
  set(next);
}

async function toggleScreenShare(
  roomRef: React.RefObject<Room | null>,
  current: boolean,
  set: (v: boolean) => void,
) {
  const room = roomRef.current;
  if (!room) return;
  const next = !current;
  await room.localParticipant.setScreenShareEnabled(next);
  set(next);
}

function ControlBtn({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-xl border",
        active
          ? "border-fc-navy/20 bg-white text-fc-navy"
          : "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      {children}
    </button>
  );
}

function ParticipantCard({
  seat,
  speaking,
  pinned,
  onPin,
}: {
  seat: SeatSlot;
  speaking: boolean;
  pinned: boolean;
  onPin?: () => void;
}) {
  const tile = seat.tile;
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (tile?.videoTrack && videoRef.current) tile.videoTrack.attach(videoRef.current);
    return () => {
      tile?.videoTrack?.detach();
    };
  }, [tile?.videoTrack]);
  useEffect(() => {
    if (tile?.audioTrack && audioRef.current && !tile.isLocal) {
      tile.audioTrack.attach(audioRef.current);
      return () => {
        tile.audioTrack?.detach();
      };
    }
  }, [tile?.audioTrack, tile?.isLocal]);
  return (
    <div
      className={cn(
        "relative min-h-[8rem] overflow-hidden rounded-xl bg-slate-900 sm:min-h-[10rem]",
        pinned && "ring-2 ring-fc-blue ring-offset-2",
        speaking && !pinned && "ring-2 ring-emerald-400/80",
      )}
    >
      {tile?.videoTrack ? (
        <video ref={videoRef} className="h-full w-full object-cover" playsInline autoPlay muted={tile.isLocal} />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-slate-800 px-3 text-center text-sm text-white/70">
          {tile ? "Kamera aus" : seat.isAnni ? "Anni noch nicht verbunden" : `${seat.name} noch nicht verbunden`}
        </div>
      )}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent px-2 py-2">
        <span className="truncate text-xs font-semibold text-white">{seat.name}</span>
        {onPin ? (
          <button type="button" onClick={onPin} className="grid h-7 w-7 place-items-center rounded-lg bg-black/40 text-white">
            {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ScreenVideo({ track }: { track: RemoteTrack }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) track.attach(ref.current);
    return () => {
      track.detach();
    };
  }, [track]);
  return <video ref={ref} className="h-full w-full object-contain" playsInline autoPlay />;
}

function participantToTile(
  p: RemoteParticipant | LocalParticipant,
  isLocal: boolean,
  roster: BoardVideoSeatRosterItem[],
): ParticipantTile {
  let videoTrack: RemoteTrack | null = null;
  let audioTrack: RemoteTrack | null = null;
  let screenTrack: RemoteTrack | null = null;
  p.trackPublications.forEach((pub: RemoteTrackPublication | LocalTrackPublication) => {
    const track = pub.track as RemoteTrack | undefined;
    if (!track) return;
    if (track.kind === Track.Kind.Audio && !isLocal) audioTrack = track;
    if (track.kind !== Track.Kind.Video) return;
    if (pub.source === Track.Source.ScreenShare) screenTrack = track;
    else if (pub.source === Track.Source.Camera) videoTrack = track;
  });
  return {
    id: p.identity,
    name: p.name || "Teilnehmer",
    isLocal,
    isAnni: participantIsAnni(p, roster),
    videoTrack,
    audioTrack,
    screenTrack,
  };
}

function formatRemain(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(totalSec / 60)).padStart(2, "0")}:${String(totalSec % 60).padStart(2, "0")}`;
}
