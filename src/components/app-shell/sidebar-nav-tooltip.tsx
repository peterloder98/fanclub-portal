"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/** Tooltip per Portal — wird nicht vom Sidebar-Overflow verdeckt. */
export function SidebarNavTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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
    setPos({ top: r.top + r.height / 2, left: r.right + 10 });
    setVisible(true);
  }, []);

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
                transform: "translateY(-50%)",
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
