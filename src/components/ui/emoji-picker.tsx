"use client";

import { useEffect, useId, useRef, useState } from "react";
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

export function EmojiPickerButton({
  onPick,
  disabled,
  className,
  buttonClassName,
  size = "md",
  tone = "light",
  placement = "down",
  label,
}: {
  onPick: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  size?: "sm" | "md";
  tone?: "light" | "dark" | "navy";
  /** Panel öffnet nach oben (z. B. Chat unten) oder nach unten (Kommentare/Composer). */
  placement?: "up" | "down";
  /** Optionaler Text neben dem Smiley (z. B. Composer-Toolbar). */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const btnSize = label
    ? null
    : size === "sm"
      ? "h-8 w-8"
      : "h-10 w-10";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const toneClass =
    tone === "dark"
      ? "bg-white/10 text-white hover:bg-white/20"
      : tone === "navy"
        ? "border border-fc-navy/15 bg-white text-fc-navy hover:bg-fc-ice"
        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50";

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label ? undefined : "Emoji einfügen"}
        title="Emoji"
        onClick={() => setOpen((v) => !v)}
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

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Emojis"
          className={cn(
            "absolute z-[80] w-[min(18.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-fc-navy/10 bg-white shadow-xl shadow-fc-navy/15 ring-1 ring-black/5",
            placement === "up" ? "bottom-full right-0 mb-2" : "left-0 top-full mt-2",
          )}
        >
          <div className="border-b border-slate-100 bg-gradient-to-r from-fc-navy to-fc-blue px-3 py-2">
            <p className="text-xs font-semibold tracking-wide text-white">Emoji wählen</p>
          </div>
          <div className="max-h-56 space-y-3 overflow-y-auto overscroll-contain p-2.5">
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
                        onPick(emoji);
                        setOpen(false);
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
      ) : null}
    </div>
  );
}
