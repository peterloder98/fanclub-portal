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

  return (
    <div
      ref={ref}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain"
    >
      {children}
    </div>
  );
}
