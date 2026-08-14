"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Text mit max. Zeilen; bei Überlauf „mehr anzeigen“ / „weniger“. */
export function ExpandableClampedText({
  text,
  lines = 3,
  className,
}: {
  text: string;
  lines?: 2 | 3 | 4;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      if (expanded) {
        // Beim Aufklappen: weiterhin Button zeigen
        setOverflows(true);
        return;
      }
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [text, expanded, lines]);

  const clampClass =
    lines === 2 ? "line-clamp-2" : lines === 4 ? "line-clamp-4" : "line-clamp-3";

  return (
    <div className="min-w-0">
      <p
        ref={ref}
        className={cn(!expanded && clampClass, "break-words whitespace-pre-wrap", className)}
      >
        {text}
      </p>
      {overflows ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-semibold text-fc-blue hover:underline"
        >
          {expanded ? "weniger" : "mehr anzeigen"}
        </button>
      ) : null}
    </div>
  );
}
