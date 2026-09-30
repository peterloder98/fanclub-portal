"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/cn";

export function BoardMeetingPrejoin({
  defaultDisplayName,
  joining,
  error,
  onJoin,
}: {
  defaultDisplayName: string;
  joining: boolean;
  error: string | null;
  onJoin: (opts: { displayName: string; camOn: boolean; micOn: boolean }) => void;
}) {
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        streamRef.current = stream;
        for (const t of stream.getVideoTracks()) t.enabled = camOn;
        for (const t of stream.getAudioTracks()) t.enabled = micOn;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
        setPreviewError(null);
      } catch {
        if (!cancelled) {
          setPreviewError(
            "Kamera/Mikrofon nicht freigegeben. Du kannst trotzdem beitreten und die Geräte später einschalten.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      const stream = streamRef.current;
      streamRef.current = null;
      if (stream) for (const t of stream.getTracks()) t.stop();
    };
    // Preview devices once on mount; cam/mic toggles only flip track.enabled.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, []);

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    for (const t of stream.getVideoTracks()) t.enabled = camOn;
    for (const t of stream.getAudioTracks()) t.enabled = micOn;
  }, [camOn, micOn]);

  return (
    <div className="rounded-2xl border border-fc-navy/10 bg-white p-3 shadow-sm sm:p-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-center">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900">
          <video
            ref={videoRef}
            className={cn(
              "h-full w-full scale-x-[-1] object-cover",
              (!camOn || previewError) && "opacity-0",
            )}
            playsInline
            muted
            autoPlay
          />
          {!camOn || previewError ? (
            <div className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-white/80">
              {previewError ?? "Kamera aus"}
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 py-3">
            <button
              type="button"
              onClick={() => setCamOn((v) => !v)}
              aria-label={camOn ? "Kamera aus" : "Kamera an"}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-xl border",
                camOn
                  ? "border-white/30 bg-white/15 text-white"
                  : "border-rose-300/50 bg-rose-600 text-white",
              )}
            >
              {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMicOn((v) => !v)}
              aria-label={micOn ? "Mikrofon aus" : "Mikrofon an"}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-xl border",
                micOn
                  ? "border-white/30 bg-white/15 text-white"
                  : "border-rose-300/50 bg-rose-600 text-white",
              )}
            >
              {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          <div>
            <h2 className="text-base font-semibold text-fc-navy">Bereit zum Beitreten?</h2>
            <p className="mt-1 text-sm text-slate-600">
              Name prüfen, Kamera und Mikrofon einstellen — dann dem Call beitreten.
            </p>
          </div>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Anzeigename
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
              maxLength={40}
              className="h-11 rounded-xl border border-fc-navy/15 px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
              placeholder="Dein Name im Video"
              autoComplete="name"
            />
          </label>
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={joining || !displayName.trim()}
            onClick={() =>
              onJoin({
                displayName: displayName.trim() || defaultDisplayName,
                camOn,
                micOn,
              })
            }
            className="h-11 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue disabled:opacity-60"
          >
            {joining ? "Verbinde…" : "Jetzt beitreten"}
          </button>
        </div>
      </div>
    </div>
  );
}
