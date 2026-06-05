"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function UploadDropzone({
  accept,
  disabled,
  hint = "PNG, JPG oder WebP",
  onFile,
}: {
  accept: string;
  disabled?: boolean;
  hint?: string;
  onFile: (file: File) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function pick(file: File | undefined) {
    if (!file || disabled) return;
    onFile(file);
  }

  return (
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
        const f = e.dataTransfer.files?.[0];
        pick(f);
      }}
      className={cn(
        "rounded-2xl border-2 border-dashed p-6 transition",
        dragActive
          ? "border-blue-400 bg-blue-50/60"
          : "border-slate-200 bg-slate-50/80",
        disabled && "opacity-60",
      )}
    >
      <div className="text-center">
        <div className="text-sm font-semibold text-slate-800">Drag & Drop</div>
        <div className="mt-1 text-sm text-slate-600">
          oder Button „Bild hochladen“
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="h-11 w-full rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          Bild hochladen
        </button>
      </div>

      {hint ? (
        <p className="mt-3 text-center text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
