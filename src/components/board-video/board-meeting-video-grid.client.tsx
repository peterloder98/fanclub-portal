"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type ParticipantTile = {
  id: string;
  name: string;
  isLocal: boolean;
  videoTrack: RemoteTrack | null;
  audioTrack: RemoteTrack | null;
  screenTrack: RemoteTrack | null;
  isSpeaking: boolean;
};

function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-2 lg:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
}

export function BoardMeetingVideoGrid({
  token,
  serverUrl,
  displayName,
  endsAt,
  canEndMeeting,
  onEnded,
  onLimitReached,
}: {
  token: string;
  serverUrl: string;
  displayName: string;
  endsAt: string;
  canEndMeeting: boolean;
  onEnded: () => void;
  onLimitReached: () => void;
}) {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [tiles, setTiles] = useState<ParticipantTile[]>([]);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, new Date(endsAt).getTime() - Date.now()),
  );
  const endedRef = useRef(false);

  const rebuildTiles = useCallback((room: Room) => {
    const next: ParticipantTile[] = [participantToTile(room.localParticipant, true)];
    room.remoteParticipants.forEach((p) => next.push(participantToTile(p, false)));
    setTiles(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    const onAnyChange = () => {
      if (!cancelled) rebuildTiles(room);
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
        rebuildTiles(room);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Verbindung fehlgeschlagen.");
      }
    })();
    return () => {
      cancelled = true;
      void room.disconnect();
    };
  }, [token, serverUrl, displayName, rebuildTiles]);

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

  const focusId = useMemo(() => {
    if (pinnedId) return pinnedId;
    const speaking = activeSpeakers.find((id) => tiles.some((t) => t.id === id));
    if (speaking) return speaking;
    return tiles.find((t) => t.screenTrack)?.id ?? null;
  }, [pinnedId, activeSpeakers, tiles]);

  const screenTile = tiles.find((t) => t.screenTrack);
  const warn = remainingMs > 0 && remainingMs <= 10 * 60_000;
  const urgent = remainingMs > 0 && remainingMs <= 60_000;
  const orderedTiles = useMemo(() => {
    if (!focusId) return tiles;
    const focus = tiles.find((t) => t.id === focusId);
    const rest = tiles.filter((t) => t.id !== focusId);
    return focus ? [focus, ...rest] : tiles;
  }, [tiles, focusId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        className={cn(
          "flex shrink-0 items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums",
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
      <div className={cn("grid min-h-0 flex-1 auto-rows-fr gap-2", gridClass(orderedTiles.length))}>
        {orderedTiles.map((tile) => (
          <ParticipantCard
            key={tile.id}
            tile={{ ...tile, isSpeaking: activeSpeakers.includes(tile.id) }}
            focused={tile.id === focusId && orderedTiles.length > 1}
            pinned={pinnedId === tile.id}
            onPin={() => setPinnedId((prev) => (prev === tile.id ? null : tile.id))}
          />
        ))}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
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
  tile,
  focused,
  pinned,
  onPin,
}: {
  tile: ParticipantTile;
  focused: boolean;
  pinned: boolean;
  onPin: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (tile.videoTrack && videoRef.current) tile.videoTrack.attach(videoRef.current);
    return () => {
      tile.videoTrack?.detach();
    };
  }, [tile.videoTrack]);
  useEffect(() => {
    if (tile.audioTrack && audioRef.current && !tile.isLocal) {
      tile.audioTrack.attach(audioRef.current);
      return () => {
        tile.audioTrack?.detach();
      };
    }
  }, [tile.audioTrack, tile.isLocal]);
  return (
    <div
      className={cn(
        "relative min-h-[8rem] overflow-hidden rounded-xl bg-slate-900 sm:min-h-[10rem]",
        focused && "ring-2 ring-fc-blue ring-offset-2",
        tile.isSpeaking && !focused && "ring-2 ring-emerald-400/80",
      )}
    >
      <video ref={videoRef} className="h-full w-full object-cover" playsInline autoPlay muted={tile.isLocal} />
      {!tile.videoTrack ? (
        <div className="absolute inset-0 grid place-items-center bg-slate-800 text-sm text-white/70">
          Kamera aus
        </div>
      ) : null}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 to-transparent px-2 py-2">
        <span className="truncate text-xs font-semibold text-white">{tile.name}</span>
        {!tile.isLocal ? (
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

function participantToTile(p: RemoteParticipant | LocalParticipant, isLocal: boolean): ParticipantTile {
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
    videoTrack,
    audioTrack,
    screenTrack,
    isSpeaking: false,
  };
}

function formatRemain(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(totalSec / 60)).padStart(2, "0")}:${String(totalSec % 60).padStart(2, "0")}`;
}
