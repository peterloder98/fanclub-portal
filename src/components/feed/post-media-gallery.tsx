"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export type PostMediaItem = {
  id: string;
  url: string;
  mediaType?: "image" | "video";
};

function inferMediaType(url: string): "image" | "video" {
  return /\.mp4(\?|$)/i.test(url) ? "video" : "image";
}

export function PostMediaGallery({
  media,
  size = "sm",
}: {
  media: PostMediaItem[];
  /** sm = Feed-Kompakt, md = Moderation / größere Vorschau ohne Zuschnitt */
  size?: "sm" | "md";
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxType, setLightboxType] = useState<"image" | "video">("image");
  const items = media.slice(0, 6);
  const maxH = size === "md" ? "max-h-40" : "max-h-28";
  const singleMaxW = size === "md" ? "max-w-[min(100%,20rem)]" : "max-w-[min(100%,14rem)]";
  const multiMaxW = size === "md" ? "max-w-[calc(50%-0.25rem)] sm:max-w-[11rem]" : "max-w-[calc(50%-0.25rem)] sm:max-w-[9rem]";

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxUrl]);

  if (!items.length) return null;

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((m) => {
          const type = m.mediaType ?? inferMediaType(m.url);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setLightboxType(type);
                setLightboxUrl(m.url);
              }}
              className={cn(
                "rounded-lg border bg-slate-50 p-0.5 transition hover:ring-2 hover:ring-blue-200",
                items.length === 1 ? singleMaxW : multiMaxW,
              )}
              aria-label={type === "video" ? "Video abspielen" : "Bild vergrößern"}
            >
              {type === "video" ? (
                <video
                  src={m.url}
                  className={cn("block w-auto max-w-full object-contain", maxH)}
                  muted
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.url}
                  alt=""
                  className={cn("block w-auto max-w-full object-contain", maxH)}
                  loading="lazy"
                  decoding="async"
                />
              )}
            </button>
          );
        })}
      </div>

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Medien in voller Größe"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
          {lightboxType === "video" ? (
            <video
              src={lightboxUrl}
              className="max-h-[min(88vh,720px)] max-w-[min(96vw,720px)]"
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxUrl}
              alt=""
              className="max-h-[min(88vh,720px)] max-w-[min(96vw,720px)] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      ) : null}
    </>
  );
}
