"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pingAppActivity } from "@/app/(app)/mitglieder/intro-actions";

/**
 * App-Heartbeat + einmaliges Intro-Onboarding nach Login.
 * Heartbeat bei Navigation (gedrosselt), damit App-Zugriffe sinnvoll zählen.
 */
export function AppActivityAndOnboarding({
  needsWelcomeOnboarding,
}: {
  needsWelcomeOnboarding: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const lastPingAt = useRef(0);

  useEffect(() => {
    const now = Date.now();
    // Mindestens alle 30s bei Navigation erneut zählen
    if (now - lastPingAt.current < 30_000) return;
    lastPingAt.current = now;
    void pingAppActivity();
  }, [pathname]);

  useEffect(() => {
    if (!needsWelcomeOnboarding) return;
    if (pathname === "/willkommen" || pathname?.startsWith("/willkommen/")) return;
    // Konto-Einrichtung darf vor dem Willkommen abgeschlossen werden
    if (pathname?.startsWith("/setup-account")) return;
    // Admin verlässt Willkommen-Vorschau → einmalig nicht zurückzwingen
    try {
      const raw = sessionStorage.getItem("fc-welcome-preview-exit");
      if (raw) {
        const at = Number(raw);
        sessionStorage.removeItem("fc-welcome-preview-exit");
        if (Number.isFinite(at) && Date.now() - at < 120_000) return;
      }
    } catch {
      /* ignore */
    }
    router.replace("/willkommen");
  }, [needsWelcomeOnboarding, pathname, router]);

  return null;
}
