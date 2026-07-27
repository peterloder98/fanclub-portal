"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pingAppActivity } from "@/app/(app)/mitglieder/intro-actions";

/**
 * App-Heartbeat + einmaliges Intro-Onboarding nach Login.
 * Läuft im App-Shell, ohne den Seiteninhalt zu blockieren.
 */
export function AppActivityAndOnboarding({
  needsIntroOnboarding,
}: {
  needsIntroOnboarding: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const pinged = useRef(false);

  useEffect(() => {
    if (pinged.current) return;
    pinged.current = true;
    void pingAppActivity();
  }, []);

  useEffect(() => {
    if (!needsIntroOnboarding) return;
    if (pathname === "/willkommen" || pathname?.startsWith("/willkommen/")) return;
    if (pathname === "/profile" || pathname?.startsWith("/setup-account")) return;
    router.replace("/willkommen");
  }, [needsIntroOnboarding, pathname, router]);

  return null;
}
