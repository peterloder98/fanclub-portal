"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { cropAndOptimizeAvatar } from "@/lib/avatars/crop";
import { AVATAR_STORAGE_PX } from "@/lib/images/specs";

export function AvatarCropModal({
  file,
  onClose,
  onSave,
}: {
  file: File;
  onClose: () => void;
  onSave: (result: { blob: Blob; contentType: string }) => Promise<void>;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setImageError(null);
    setImageUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setImageUrl(url);
    };
    img.onerror = () => {
      if (!cancelled) {
        setImageError(
          "Bild konnte nicht geladen werden. Bitte JPG, PNG oder WebP verwenden.",
        );
        URL.revokeObjectURL(url);
      }
    };
    img.src = url;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels || !imageUrl) return;
    setBusy(true);
    setError(null);
    try {
      const { blob, contentType } = await cropAndOptimizeAvatar({
        file,
        crop: {
          x: Math.round(croppedAreaPixels.x),
          y: Math.round(croppedAreaPixels.y),
          width: Math.round(croppedAreaPixels.width),
          height: Math.round(croppedAreaPixels.height),
        },
        outputSize: AVATAR_STORAGE_PX,
        quality: 0.72,
      });
      await onSave({ blob, contentType });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Zuschneiden");
    } finally {
      setBusy(false);
    }
  }

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl shadow-slate-900/25">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <div className="text-base font-semibold text-slate-900">
              Bild zuschneiden
            </div>
            <div className="mt-0.5 text-sm text-slate-600">
              Ziehen zum Verschieben · Zoom mit dem Regler
            </div>
          </div>
          <button
            type="button"
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onClick={onClose}
            disabled={busy}
          >
            Abbrechen
          </button>
        </div>

        <div className="relative h-[420px] w-full bg-slate-100">
          {imageError ? (
            <div className="grid h-full place-items-center p-6 text-center text-sm text-rose-700">
              {imageError}
            </div>
          ) : imageUrl ? (
            <Cropper
              key={`${file.name}-${file.size}-${file.lastModified}`}
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-600">
              Lade Vorschau…
            </div>
          )}
        </div>

        <div className="space-y-3 border-t bg-white px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">
              Zoom
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              disabled={busy || !imageUrl}
              className="w-full accent-blue-600"
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              onClick={onClose}
              disabled={busy}
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={busy || !imageUrl}
              onClick={handleSave}
              className="h-11 flex-1 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white shadow-sm hover:bg-fc-blue disabled:opacity-60"
            >
              {busy ? "Speichere…" : "Zuschneiden & speichern"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
