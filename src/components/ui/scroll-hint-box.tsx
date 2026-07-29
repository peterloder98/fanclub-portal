"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Scrollbarer Kommentar-Bereich.
 * „Mehr Kommentare“ liegt als Overlay über dem Inhalt und vergrößert die Box nicht.
 */
export function ScrollHintBox({
  children,
  className,
  maxHeightClass = "max-h-40",
}: {
  children: ReactNode;
  className?: string;
  maxHeightClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);
  const scrollable = Boolean(maxHeightClass);

  useEffect(() => {
    const el = ref.current;
    if (!el || !scrollable) {
      setCanScrollMore(false);
      return;
    }

    function update() {
      if (!el) return;
      const overflow = el.scrollHeight > el.clientHeight + 4;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
      setCanScrollMore(overflow && !nearBottom);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [children, scrollable]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        className={cn(scrollable && "overflow-y-auto overscroll-contain pr-1", maxHeightClass)}
      >
        {children}
      </div>
      {/* Overlay: nimmt keinen Layout-Platz (absolute, Höhe 0 für den Fluss) */}
      {canScrollMore ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-0 items-end justify-center"
          aria-hidden
        >
          <span className="mb-1 inline-flex translate-y-0 items-center gap-0.5 rounded-full bg-slate-800/75 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-[2px]">
            Mehr Kommentare
            <ChevronDown className="h-3 w-3 animate-bounce" />
          </span>
        </div>
      ) : null}
    </div>
  );
}
