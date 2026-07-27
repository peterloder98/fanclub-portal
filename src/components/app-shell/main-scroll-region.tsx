"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Scrollbarer Seiteninhalt — Topbar bleibt fixiert; bei Navigation nach oben scrollen. */
export function MainScrollRegion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  const fillViewport =
    pathname === "/events" || pathname === "/chat" || pathname === "/mitglieder";

  const bottomPad =
    "pb-[calc(var(--fanclub-chat-dock,0px)+var(--fanclub-mobile-tab-bar,0px))]";

  return (
    <div
      ref={ref}
      className={
        fillViewport
          ? `flex min-h-0 flex-1 flex-col overflow-hidden ${bottomPad}`
          : `flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain ${bottomPad}`
      }
    >
      {children}
    </div>
  );
}
