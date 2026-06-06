"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#c9a227", "#143165", "#2c64a3", "#4c89c1", "#ffffff", "#faf5eb"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
};

function spawnBurst(width: number, height: number): Particle[] {
  const cx = width / 2;
  const cy = height * 0.35;
  const out: Particle[] = [];
  for (let i = 0; i < 90; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    out.push({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      w: 4 + Math.random() * 6,
      h: 3 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      life: 1,
    });
  }
  return out;
}

/** Kurzer Konfetti-/Feuerwerk-Effekt im Gewinner-Bereich. */
export function GiveawayCelebration({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles = spawnBurst(canvas.width, canvas.height);
    let frame = 0;
    const maxFrames = 150;

    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.vx *= 0.99;
        p.rot += p.vr;
        p.life = Math.max(0, p.life - 0.008);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      particles = particles.filter((p) => p.life > 0 && p.y < canvas.height + 20);

      if (frame < maxFrames && (particles.length > 0 || frame < 40)) {
        if (frame === 30) particles.push(...spawnBurst(canvas.width, canvas.height));
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl"
      aria-hidden
    />
  );
}
