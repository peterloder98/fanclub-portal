"use client";

import { usePathname } from "next/navigation";

export function useIsWelcomeLockRoute() {
  const pathname = usePathname();
  return pathname === "/willkommen" || Boolean(pathname?.startsWith("/willkommen/"));
}
