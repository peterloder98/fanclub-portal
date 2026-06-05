"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FileImage, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function DocumentUploadField({
  label = "Beleg",
  hint = "Drag & Drop oder Button — wird automatisch komprimiert (WebP, klein).",
  disabled,
  previewUrl,
  onFileSelected,
  onClear,
}: {
  label?: string;
  hint?: string;
  disabled?: boolean;
  previewUrl?: string | null;
  onFileSelected: (file: File) => void | Promise<void>;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  async function handleFile(file: File | undefined) {
    if (!file || disabled || busy) return;
    setBusy(true);
    try {
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
      setLocalPreview(URL.createObjectURL(file));
      await onFileSelected(file);
    } finally {
      setBusy(false);
    }
  }

  const shownPreview = localPreview ?? previewUrl ?? null;

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {shownPreview ? (
        <div className="relative overflow-hidden rounded-xl border bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shownPreview} alt="" className="max-h-40 w-full object-contain" />
          {onClear ? (
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => {
                if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
                setLocalPreview(null);
                onClear();
              }}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-700 shadow"
              aria-label="Beleg entfernen"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "rounded-2xl border-2 border-dashed p-5 transition",
            dragActive ? "border-blue-400 bg-blue-50/60" : "border-slate-200 bg-slate-50/80",
            (disabled || busy) && "opacity-60",
          )}
        >
          <div className="flex flex-col items-center text-center">
            <FileImage className="h-8 w-8 text-slate-400" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-slate-800">Datei hierher ziehen</p>
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
              <Camera className="h-3 w-3" aria-hidden />
              Handy-App später: Foto/Scan direkt möglich
            </p>
          </div>
          <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={disabled || busy}
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
              className="h-10 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Wird verarbeitet…" : "Bild hochladen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export async function uploadClubDocument(file: File, kind: "receipt" | "merchandise", targetId?: string) {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("kind", kind);
  if (targetId) fd.set("targetId", targetId);
  const res = await fetch("/api/club-documents/upload", { method: "POST", body: fd });
  const json = (await res.json()) as { path?: string; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Upload fehlgeschlagen");
  return json.path as string;
}
