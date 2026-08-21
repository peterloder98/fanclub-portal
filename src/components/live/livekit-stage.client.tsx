"use client";

import { useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
  type LocalTrackPublication,
} from "livekit-client";
import { cn } from "@/lib/cn";

type Mode = "viewer" | "host";

export function LiveKitStage({
  token,
  serverUrl,
  mode,
  className,
}: {
  token: string;
  serverUrl: string;
  mode: Mode;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;
    setConnecting(true);
    setConnected(false);
    setNeedsReconnect(false);
    setHasRemoteVideo(false);
    setError(null);

    room.on(RoomEvent.MediaDevicesError, (e: Error) => {
      console.warn("[livekit] MediaDevicesError", e);
      if (mode === "host") {
        setError(
          e.message ||
            "Kamera/Mikrofon nicht verfügbar. Bitte Berechtigung erteilen und erneut verbinden.",
        );
      }
    });

    function attachRemote(track: RemoteTrack) {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setHasRemoteVideo(true);
      }
      if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current);
      }
    }

    function onTrackSubscribed(
      track: RemoteTrack,
      _pub: RemoteTrackPublication,
      _participant: RemoteParticipant,
    ) {
      attachRemote(track);
    }

    function onTrackUnsubscribed(
      track: RemoteTrack,
      _pub: RemoteTrackPublication,
      _participant: RemoteParticipant,
    ) {
      track.detach();
      if (track.kind === Track.Kind.Video) {
        const still = [...room.remoteParticipants.values()].some((p) =>
          [...p.videoTrackPublications.values()].some((pub) => pub.isSubscribed && pub.track),
        );
        setHasRemoteVideo(still);
      }
    }

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.Disconnected, () => {
      if (cancelled) return;
      setConnected(false);
      setHasRemoteVideo(false);
      setConnecting(false);
      setNeedsReconnect(true);
    });

    void (async () => {
      try {
        await room.connect(serverUrl, token);
        if (cancelled) {
          await room.disconnect();
          return;
        }
        setConnected(true);
        setConnecting(false);
        setNeedsReconnect(false);

        if (mode === "host") {
          await room.localParticipant.setCameraEnabled(true);
          await room.localParticipant.setMicrophoneEnabled(true);
          const camPub = [...room.localParticipant.videoTrackPublications.values()][0] as
            | LocalTrackPublication
            | undefined;
          if (camPub?.track && videoRef.current) {
            camPub.track.attach(videoRef.current);
            setHasRemoteVideo(true);
          }
          setCamOn(true);
          setMicOn(true);
        } else {
          room.remoteParticipants.forEach((p) => {
            p.trackPublications.forEach((pub) => {
              if (pub.isSubscribed && pub.track) attachRemote(pub.track as RemoteTrack);
            });
          });
        }
      } catch (e) {
        if (!cancelled) {
          setConnecting(false);
          setNeedsReconnect(true);
          setError(e instanceof Error ? e.message : "Verbindung fehlgeschlagen.");
        }
      }
    })();

    return () => {
      cancelled = true;
      room.removeAllListeners();
      void room.disconnect();
      roomRef.current = null;
    };
  }, [token, serverUrl, mode, attempt]);

  async function toggleCam() {
    const room = roomRef.current;
    if (!room || mode !== "host") return;
    const next = !camOn;
    await room.localParticipant.setCameraEnabled(next);
    setCamOn(next);
    if (next) {
      const camPub = [...room.localParticipant.videoTrackPublications.values()][0];
      if (camPub?.track && videoRef.current) {
        camPub.track.attach(videoRef.current);
        setHasRemoteVideo(true);
      }
    } else {
      setHasRemoteVideo(false);
    }
  }

  async function toggleMic() {
    const room = roomRef.current;
    if (!room || mode !== "host") return;
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }

  function reconnect() {
    setError(null);
    setNeedsReconnect(false);
    setAttempt((n) => n + 1);
  }

  const showReconnect = needsReconnect && !connecting;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-slate-900", className)}>
      <video
        ref={videoRef}
        className="aspect-video w-full bg-black object-cover"
        playsInline
        autoPlay
        muted={mode === "host"}
      />
      <audio ref={audioRef} autoPlay />
      {!hasRemoteVideo && !error ? (
        <div className="absolute inset-0 grid place-items-center bg-slate-900/90 px-6 text-center">
          {connecting ? (
            <p className="text-sm text-white/90">Verbinde…</p>
          ) : connected ? (
            mode === "host" ? (
              <p className="text-sm text-white/90">Kamera starten…</p>
            ) : (
              <div className="max-w-md">
                <p className="text-base font-medium leading-relaxed text-white">
                  Schön, dass ihr dabei seid, Anni wird gleich bei uns sein und wir beginnen mit dem
                  Fan-Chat
                </p>
              </div>
            )
          ) : showReconnect ? (
            <div className="max-w-sm">
              <p className="text-sm text-white/90">Verbindung unterbrochen.</p>
              <button
                type="button"
                onClick={reconnect}
                className="mt-3 h-10 rounded-xl bg-white px-4 text-sm font-semibold text-fc-navy hover:bg-fc-ice"
              >
                Erneut verbinden
              </button>
            </div>
          ) : (
            <p className="text-sm text-white/90">Nicht verbunden</p>
          )}
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-rose-950/90 px-4 text-center">
          <div>
            <p className="text-sm text-rose-100">{error}</p>
            <button
              type="button"
              onClick={reconnect}
              className="mt-3 h-10 rounded-xl bg-white px-4 text-sm font-semibold text-fc-navy hover:bg-fc-ice"
            >
              Erneut verbinden
            </button>
          </div>
        </div>
      ) : null}
      {mode === "host" && connected ? (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          <button
            type="button"
            onClick={() => void toggleMic()}
            className={cn(
              "h-10 rounded-full px-4 text-sm font-semibold text-white shadow",
              micOn ? "bg-fc-navy" : "bg-rose-600",
            )}
          >
            {micOn ? "Mikro an" : "Mikro aus"}
          </button>
          <button
            type="button"
            onClick={() => void toggleCam()}
            className={cn(
              "h-10 rounded-full px-4 text-sm font-semibold text-white shadow",
              camOn ? "bg-fc-navy" : "bg-rose-600",
            )}
          >
            {camOn ? "Kamera an" : "Kamera aus"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
