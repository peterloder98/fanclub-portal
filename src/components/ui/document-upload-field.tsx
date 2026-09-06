"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FileImage, FileText, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { RECEIPT_ACCEPT } from "@/lib/images/specs";

function isPdfFile(file: File | null | undefined, previewUrl?: string | null): boolean {
  if (file) {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  }
  return Boolean(previewUrl && /\.pdf(\?|$)/i.test(previewUrl));
}

export function DocumentUploadField({
  label = "Beleg",
  hint,
  disabled,
  previewUrl,
  onFileSelected,
  onClear,
  allowPdf = false,
}: {
  label?: string;
  hint?: string;
  disabled?: boolean;
  previewUrl?: string | null;
  onFileSelected: (file: File) => void | Promise<void>;
  onClear?: () => void;
  allowPdf?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  async function handleFile(file: File | undefined) {
    if (!file || disabled || busy) return;
    setBusy(true);
    setUploadError(null);
    let blobUrl: string | null = null;
    try {
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
      blobUrl = URL.createObjectURL(file);
      setLocalPreview(blobUrl);
      setLocalFile(file);
      await onFileSelected(file);
    } catch (e) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setLocalPreview(null);
      setLocalFile(null);
      setUploadError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  const shownPreview = localPreview ?? previewUrl ?? null;
  const pdfPreview = isPdfFile(localFile, previewUrl ?? localFile?.name ?? shownPreview);

  const resolvedHint =
    hint ??
    (allowPdf
      ? "Foto (JPEG/PNG/WebP) oder PDF — Bilder werden klein komprimiert."
      : "Drag & Drop oder Button — wird automatisch komprimiert (WebP, klein).");

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {uploadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {uploadError}
        </div>
      ) : null}
      {shownPreview ? (
        <div className="relative overflow-hidden rounded-xl border bg-slate-50">
          {pdfPreview ? (
            <div className="flex items-center gap-3 px-4 py-5">
              <FileText className="h-8 w-8 shrink-0 text-fc-navy" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {localFile?.name ?? "PDF-Beleg"}
                </p>
                <p className="text-xs text-slate-500">PDF hochgeladen — öffnen über „Beleg“.</p>
              </div>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownPreview} alt="" className="max-h-40 w-full object-contain" />
          )}
          {onClear ? (
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => {
                if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
                setLocalPreview(null);
                setLocalFile(null);
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
            dragActive ? "border-blue-400 bg-fc-ice/60" : "border-slate-200 bg-slate-50/80",
            (disabled || busy) && "opacity-60",
          )}
        >
          <div className="flex flex-col items-center text-center">
            <FileImage className="h-8 w-8 text-slate-400" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-slate-800">Datei hierher ziehen</p>
            <p className="mt-1 text-xs text-slate-500">{resolvedHint}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
              <Camera className="h-3 w-3" aria-hidden />
              Handy-App später: Foto/Scan direkt möglich
            </p>
          </div>
          <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <input
              ref={inputRef}
              type="file"
              accept={allowPdf ? RECEIPT_ACCEPT : "image/*"}
              {...(allowPdf ? {} : { capture: "environment" as const })}
              disabled={disabled || busy}
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
              className="h-10 rounded-xl bg-fc-navy px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Wird verarbeitet…" : allowPdf ? "Foto oder PDF" : "Bild hochladen"}
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
