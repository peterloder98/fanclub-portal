"use client";

import { anniStarsDeltaHtml } from "@/lib/anni-stars/format";
import { emitPointsDelta } from "@/lib/points/events";
import { getPointsTargetElement } from "@/lib/points/target";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type FlyRect = { left: number; top: number; width: number; height: number };

function isUsableRect(r: FlyRect | DOMRect | null | undefined): r is FlyRect | DOMRect {
  if (!r) return false;
  // Detachierte Elemente liefern nach Re-Render oft 0×0 bei (0,0)
  return r.width > 0 || r.height > 0;
}

function resolveStartRect(
  fromEl?: HTMLElement | null,
  fromRect?: FlyRect | DOMRect | null,
): FlyRect | DOMRect | null {
  if (isUsableRect(fromRect)) return fromRect;
  if (fromEl?.isConnected) {
    const r = fromEl.getBoundingClientRect();
    if (isUsableRect(r)) return r;
  }
  return null;
}

/** Fallback: Bildschirmmitte / unter der Topbar, damit Animation nie still ausfällt. */
function fallbackStartRect(): FlyRect {
  return {
    left: window.innerWidth / 2 - 20,
    top: Math.min(window.innerHeight * 0.45, 320),
    width: 40,
    height: 40,
  };
}

function spawnPopAt(x: number, y: number, positive: boolean) {
  const colors = positive
    ? ["#34d399", "#10b981", "#059669", "#c9a227"]
    : ["#fb7185", "#f43f5e", "#fda4af", "#fecdd3"];

  for (let i = 0; i < 10; i++) {
    const dot = document.createElement("div");
    const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.35;
    const dist = 14 + Math.random() * 22;
    dot.style.position = "fixed";
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    dot.style.width = "7px";
    dot.style.height = "7px";
    dot.style.borderRadius = "999px";
    dot.style.pointerEvents = "none";
    dot.style.zIndex = "10050";
    dot.style.background = colors[i % colors.length]!;
    dot.style.transform = "translate(-50%, -50%) scale(1)";
    dot.style.transition = "transform 320ms ease-out, opacity 320ms ease-out";
    document.body.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.transform = `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0)`;
      dot.style.opacity = "0";
    });
    setTimeout(() => dot.remove(), 360);
  }
}

/** Sofort BoundingClientRect sichern (vor await/Re-Render), sonst fliegt die Animation nicht. */
export function captureFlyRect(el: HTMLElement | null | undefined): FlyRect | null {
  if (!el?.isConnected) return null;
  const r = el.getBoundingClientRect();
  if (!isUsableRect(r)) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

export function flyPointsFromElement(params: {
  fromEl?: HTMLElement | null;
  fromRect?: FlyRect | DOMRect | null;
  delta: number;
}) {
  if (typeof window === "undefined") return;
  const { fromEl, fromRect, delta } = params;
  if (!delta) return;

  const from = resolveStartRect(fromEl, fromRect) ?? fallbackStartRect();

  const target = getPointsTargetElement();
  const to = target?.getBoundingClientRect();
  const endX = to
    ? to.left + to.width / 2
    : Math.min(window.innerWidth - 48, window.innerWidth * 0.85);
  const endY = to ? to.top + to.height / 2 : 40;

  const startX = from.left + from.width / 2;
  const startY = from.top + from.height / 2;

  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.left = "0px";
  el.style.top = "0px";
  el.style.zIndex = "10040";
  el.style.pointerEvents = "none";
  el.style.willChange = "transform, opacity";
  el.style.transform = `translate(${startX}px, ${startY}px) translate(-50%, -50%)`;

  const badge = document.createElement("div");
  badge.innerHTML = anniStarsDeltaHtml(delta);
  el.appendChild(badge);
  document.body.appendChild(el);

  const duration = 1550;
  const start = performance.now();
  const midX = startX + (endX - startX) * 0.5;
  const lift = clamp(Math.abs(endX - startX) * 0.15 + Math.abs(endY - startY) * 0.2, 48, 140);
  const midY = Math.min(startY, endY) - lift;

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  function bezier(t: number, p0: number, p1: number, p2: number) {
    return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
  }

  function tick(now: number) {
    const t = clamp((now - start) / duration, 0, 1);
    const e = easeOutCubic(t);
    const x = bezier(e, startX, midX, endX);
    const y = bezier(e, startY, midY, endY);
    const s = 1 - t * 0.12;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
    el.style.opacity = t < 0.9 ? "1" : String(1 - (t - 0.9) / 0.1);

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      el.remove();
      spawnPopAt(endX, endY, delta > 0);
      emitPointsDelta(delta);
    }
  }

  requestAnimationFrame(tick);
}
