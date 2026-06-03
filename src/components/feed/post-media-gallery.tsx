"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function PostMediaGallery({
  media,
}: {
  media: Array<{ id: string; url: string }>;
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const items = media.slice(0, 4);

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
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setLightboxUrl(m.url)}
            className={cn(
              "rounded-lg border bg-slate-50 p-0.5 transition hover:ring-2 hover:ring-blue-200",
              items.length === 1 ? "max-w-[min(100%,16rem)]" : "max-w-[calc(50%-0.25rem)] sm:max-w-[9rem]",
            )}
            aria-label="Bild vergrößern"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.url}
              alt=""
              className="block max-h-28 w-auto max-w-full object-contain"
            />
          </button>
        ))}
      </div>

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Bild in voller Größe"
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[min(92vh,960px)] max-w-[min(96vw,1200px)] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
