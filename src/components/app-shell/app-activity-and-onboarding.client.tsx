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
    router.replace("/willkommen");
  }, [needsWelcomeOnboarding, pathname, router]);

  return null;
}
