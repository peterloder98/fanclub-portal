"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Smile } from "lucide-react";
import { cn } from "@/lib/cn";

/** Kuratierte, moderne Auswahl — reicht für Chat/Kommentare ohne schwere Library. */
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤩",
      "😇", "🤗", "🤔", "😅", "😆", "😉", "😌", "😴", "🥴", "🥳",
      "😭", "😤", "😡", "🤯", "😱", "🫣", "🫡", "🫠", "😈", "👻",
    ],
  },
  {
    label: "Gesten",
    emojis: [
      "👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "🤟", "🤘", "👋",
      "💪", "🙏", "💯", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤",
      "🤍", "💔", "✨", "⭐", "🔥", "💥", "🎉", "🎊", "💫", "🌟",
    ],
  },
  {
    label: "Fan & Spaß",
    emojis: [
      "🎤", "🎶", "🎵", "🎸", "🎧", "📻", "📸", "🎬", "🎟️", "🏆",
      "🥇", "🎯", "🚀", "🌈", "☀️", "🌙", "🌸", "🍀", "🍕", "☕",
      "🍻", "🥂", "🎂", "🎁", "🚗", "✈️", "🏠", "📍", "🇩🇪", "🇦🇹",
    ],
  },
];

const PANEL_W = 296;
const PANEL_MAX_H = 280;

type Coords = { top: number; left: number };

export function EmojiPickerButton({
  onPick,
  disabled,
  className,
  buttonClassName,
  size = "md",
  tone = "light",
  placement = "down",
  label,
  onOpenChange,
}: {
  onPick: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  size?: "sm" | "md";
  tone?: "light" | "dark" | "navy";
  /** Panel bevorzugt nach oben-links (Chat) oder nach unten (Kommentare/Composer). */
  placement?: "up" | "down";
  /** Optionaler Text neben dem Smiley (z. B. Composer-Toolbar). */
  label?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => setMounted(true), []);

  function setOpenSafe(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    function place() {
      const btn = buttonRef.current?.getBoundingClientRect();
      if (!btn) return;
      const gap = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panelH = panelRef.current?.offsetHeight || PANEL_MAX_H;

      let left: number;
      let top: number;

      if (placement === "up") {
        // Vom Button aus nach links oben (rechte Kante am Button ausrichten)
        left = btn.right - PANEL_W;
        top = btn.top - panelH - gap;
        if (top < 8) top = Math.max(8, btn.bottom + gap);
      } else {
        left = btn.left;
        top = btn.bottom + gap;
        if (top + panelH > vh - 8) {
          top = Math.max(8, btn.top - panelH - gap);
        }
      }

      left = Math.min(left, vw - PANEL_W - 8);
      left = Math.max(8, left);
      setCoords({ top, left });
    }

    place();
    // Nach erstem Paint echte Panel-Höhe messen und nachjustieren
    const raf = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, placement]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpenSafe(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenSafe(false);
    }
    // click statt mousedown: sonst schließt der gleiche Klick das Panel sofort wieder
    document.addEventListener("click", onDoc, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc, true);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setOpenSafe is stable enough for close
  }, [open]);

  const btnSize = label ? null : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const toneClass =
    tone === "dark"
      ? "bg-white/10 text-white hover:bg-white/20"
      : tone === "navy"
        ? "border border-fc-navy/15 bg-white text-fc-navy hover:bg-fc-ice"
        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50";

  const panel =
    open && mounted ? (
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label="Emojis"
        data-emoji-picker-portal=""
        style={{ top: coords.top, left: coords.left, width: PANEL_W }}
        className="fixed z-[2100] overflow-hidden rounded-2xl border border-fc-navy/10 bg-white shadow-xl shadow-fc-navy/20 ring-1 ring-black/5"
      >
        <div className="border-b border-slate-100 bg-gradient-to-r from-fc-navy to-fc-blue px-3 py-2">
          <p className="text-xs font-semibold tracking-wide text-white">Emoji wählen</p>
        </div>
        <div
          className="space-y-3 overflow-y-auto overscroll-contain p-2.5"
          style={{ maxHeight: PANEL_MAX_H - 40 }}
        >
          {EMOJI_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {g.label}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {g.emojis.map((emoji) => (
                  <button
                    key={`${g.label}-${emoji}`}
                    type="button"
                    className="grid aspect-square place-items-center rounded-lg text-lg transition hover:bg-fc-ice active:scale-95"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPick(emoji);
                      setOpenSafe(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={label ? undefined : "Emoji einfügen"}
        onMouseDown={(e) => {
          // Focus im Composer/Kommentar behalten → kein Zuklappen
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          setOpenSafe(!open);
        }}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-xl transition disabled:opacity-40",
          btnSize,
          label ? "font-medium" : "grid place-items-center",
          toneClass,
          buttonClassName,
        )}
      >
        <Smile className={iconSize} aria-hidden />
        {label ? <span>{label}</span> : null}
      </button>
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
