"use client";

import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function SignaturePad({
  disabled,
  onSave,
}: {
  disabled?: boolean;
  onSave: (blob: Blob) => Promise<void> | void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const dpr = useMemo(() => (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1), []);

  function ensureSize() {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (c.width !== Math.floor(w * dpr) || c.height !== Math.floor(h * dpr)) {
      const prev = c.toDataURL("image/png");
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.2;
        // re-draw previous (best effort)
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, w, h);
        img.src = prev;
      }
    }
  }

  function pos(e: PointerEvent | React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function start(e: React.PointerEvent) {
    if (disabled) return;
    ensureSize();
    drawing.current = true;
    last.current = pos(e);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function move(e: React.PointerEvent) {
    if (disabled) return;
    if (!drawing.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const p = pos(e);
    const prev = last.current;
    if (!prev) {
      last.current = p;
      return;
    }
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setHasInk(true);
  }

  function end() {
    drawing.current = false;
    last.current = null;
  }

  function clear() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = c.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    setHasInk(false);
  }

  async function save() {
    const c = canvasRef.current;
    if (!c) return;
    await new Promise<void>((resolve) => c.toBlob(async (b) => {
      if (!b) return resolve();
      await onSave(b);
      resolve();
    }, "image/png"));
  }

  return (
    <div className="grid gap-2">
      <div className="rounded-2xl border bg-white p-3">
        <div className="text-xs font-semibold text-slate-600">Unterschrift (zeichnen)</div>
        <canvas
          ref={canvasRef}
          className={cn(
            "mt-2 h-40 w-full touch-none rounded-xl border bg-slate-50",
            disabled ? "opacity-60" : "",
          )}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={clear}
          className="h-10 rounded-xl border bg-white px-4 text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5 hover:bg-slate-50"
        >
          Leeren
        </button>
        <button
          type="button"
          disabled={disabled || !hasInk}
          onClick={() => void save()}
          className="h-10 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white shadow-sm shadow-slate-900/10 disabled:opacity-60"
        >
          Unterschrift speichern
        </button>
      </div>
    </div>
  );
}

