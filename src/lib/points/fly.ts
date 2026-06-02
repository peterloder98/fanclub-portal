"use client";

import { emitPointsDelta } from "@/lib/points/events";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function spawnPopAt(x: number, y: number, positive: boolean) {
  const colors = positive
    ? ["#34d399", "#10b981", "#6ee7b7", "#a7f3d0"]
    : ["#fb7185", "#f43f5e", "#fda4af", "#fecdd3"];

  for (let i = 0; i < 8; i++) {
    const dot = document.createElement("div");
    const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
    const dist = 12 + Math.random() * 18;
    dot.style.position = "fixed";
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    dot.style.width = "6px";
    dot.style.height = "6px";
    dot.style.borderRadius = "999px";
    dot.style.pointerEvents = "none";
    dot.style.zIndex = "10000";
    dot.style.background = colors[i % colors.length];
    dot.style.transform = "translate(-50%, -50%) scale(1)";
    dot.style.transition = "transform 280ms ease-out, opacity 280ms ease-out";
    document.body.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.transform = `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0)`;
      dot.style.opacity = "0";
    });
    setTimeout(() => dot.remove(), 320);
  }
}

export function flyPointsFromElement(params: {
  fromEl: HTMLElement | null;
  delta: number;
}) {
  if (typeof window === "undefined") return;
  const { fromEl, delta } = params;
  if (!delta) return;

  const target = document.querySelector<HTMLElement>("[data-points-target='true']");
  if (!fromEl || !target) {
    emitPointsDelta(delta);
    return;
  }

  const from = fromEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();

  const startX = from.left + from.width / 2;
  const startY = from.top + from.height / 2;
  const endX = to.left + to.width / 2;
  const endY = to.top + to.height / 2;

  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.left = "0px";
  el.style.top = "0px";
  el.style.zIndex = "9999";
  el.style.pointerEvents = "none";
  el.style.transform = `translate(${startX}px, ${startY}px)`;

  const badge = document.createElement("div");
  badge.textContent = `${delta >= 0 ? "+" : "−"}${Math.abs(delta)}`;
  badge.style.padding = "5px 9px";
  badge.style.borderRadius = "999px";
  badge.style.fontSize = "12px";
  badge.style.fontWeight = "800";
  badge.style.boxShadow = "0 10px 20px rgba(15,23,42,.16)";
  badge.style.border = "1px solid rgba(15,23,42,.08)";
  badge.style.background = delta >= 0 ? "rgba(236,253,245,.95)" : "rgba(254,242,242,.95)";
  badge.style.color = delta >= 0 ? "#047857" : "#be123c";

  el.appendChild(badge);
  document.body.appendChild(el);

  const duration = 1550;
  const start = performance.now();
  const midX = startX + (endX - startX) * 0.5;
  const lift = clamp(Math.abs(endX - startX) * 0.15, 40, 120);
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
    const s = 1 - t * 0.1;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
    el.style.opacity = t < 0.92 ? "1" : String(1 - (t - 0.92) / 0.08);

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
