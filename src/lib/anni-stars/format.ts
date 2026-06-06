import { ANNI_STARS_LABEL, ANNI_STARS_LABEL_SINGULAR } from "@/lib/anni-stars/terminology";

/** Stern-Symbol im Fanclub-Gold (Unicode, CI-kompatibel). */
export const ANNI_STAR_SYMBOL = "★";
export const ANNI_STAR_COLOR = "var(--fc-gold)";

export function formatAnniStarsCount(count: number): string {
  const n = Math.abs(count);
  const label = n === 1 ? ANNI_STARS_LABEL_SINGULAR : ANNI_STARS_LABEL;
  return `${n} ${label}`;
}

export function formatAnniStarsDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "−";
  return `${sign}${Math.abs(delta)} ${ANNI_STAR_SYMBOL}`;
}

export function anniStarsDeltaHtml(delta: number): string {
  const sign = delta >= 0 ? "+" : "−";
  const positive = delta >= 0;
  const numberColor = positive ? "#047857" : "#be123c";
  const starColor = positive ? "var(--fc-gold)" : "#fb7185";
  const bg = positive ? "#ecfdf5" : "#fff1f2";
  const border = positive ? "#6ee7b7" : "#fecdd3";
  const shadow = positive ? "rgba(5,150,105,.18)" : "rgba(225,29,72,.12)";
  return `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:800;background:${bg};border:1.5px solid ${border};box-shadow:0 8px 18px ${shadow};"><span style="color:${numberColor};">${sign}${Math.abs(delta)}</span><span style="color:${starColor};font-size:14px;line-height:1;">${ANNI_STAR_SYMBOL}</span></span>`;
}
