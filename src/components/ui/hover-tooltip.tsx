"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/** Portal-Tooltip — wird nicht von overflow-Containern verdeckt. */
export function HoverTooltip({
  label,
  children,
  placement = "top",
}: {
  label: string;
  children: ReactNode;
  placement?: "top" | "right";
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => setMounted(true), []);

  const show = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (placement === "right") {
      setPos({ top: r.top + r.height / 2, left: r.right + 8 });
    } else {
      setPos({ top: r.top - 8, left: r.left + r.width / 2 });
    }
    setVisible(true);
  }, [placement]);

  const hide = useCallback(() => setVisible(false), []);

  return (
    <span
      ref={anchorRef}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {mounted && visible
        ? createPortal(
            <span
              role="tooltip"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                transform:
                  placement === "right" ? "translateY(-50%)" : "translate(-50%, -100%)",
              }}
              className="pointer-events-none z-[9999] whitespace-nowrap rounded-lg border border-white/10 bg-[color:var(--fc-navy)] px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-[color:var(--fc-navy)]/30"
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
