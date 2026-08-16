"use client";

import { useState } from "react";
import { GripVertical, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ComposerMediaItem = {
  id: string;
  url: string;
  storagePath: string;
  mediaType: "image" | "video";
};

export function ComposerMediaGrid({
  items,
  disabled,
  onRemove,
  onReorder,
}: {
  items: ComposerMediaItem[];
  disabled?: boolean;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (!items.length) return null;

  return (
    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {items.map((m, index) => (
        <div
          key={m.id}
          draggable={!disabled}
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => {
            e.preventDefault();
            setOverIndex(index);
          }}
          onDragLeave={() => setOverIndex((v) => (v === index ? null : v))}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null && dragIndex !== index) onReorder(dragIndex, index);
            setDragIndex(null);
            setOverIndex(null);
          }}
          onDragEnd={() => {
            setDragIndex(null);
            setOverIndex(null);
          }}
          className={cn(
            "group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-slate-100 shadow-sm",
            overIndex === index && dragIndex !== null && dragIndex !== index
              ? "border-fc-blue ring-2 ring-fc-sky/40"
              : "border-white",
            disabled ? "opacity-70" : "",
          )}
        >
          {!disabled ? (
            <span
              className="absolute left-1 top-1 z-10 grid h-5 w-5 cursor-grab place-items-center rounded bg-black/40 text-white opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
              aria-hidden
            >
              <GripVertical className="h-3 w-3" />
            </span>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(m.id)}
            className="absolute right-1 top-1 z-10 grid h-5 w-5 place-items-center rounded-full bg-black/55 text-white transition hover:bg-rose-600 disabled:opacity-50"
            aria-label="Entfernen"
          >
            <X className="h-3 w-3" />
          </button>
          {m.mediaType === "video" ? (
            <video src={m.url} className="max-h-full max-w-full object-contain" muted playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.url} alt="" className="max-h-full max-w-full object-contain" />
          )}
        </div>
      ))}
    </div>
  );
}
