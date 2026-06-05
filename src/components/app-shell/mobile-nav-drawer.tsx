"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { appNav, NavList } from "@/components/app-shell/nav";
import { ReferMembershipNavCta } from "@/components/app-shell/refer-membership-nav-cta";
import { cn } from "@/lib/cn";

export function MobileNavDrawer({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const drawer =
    open && mounted ? (
      <div className="fixed inset-0 z-[200] lg:hidden" role="presentation">
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/50"
          aria-label="Menü schließen"
          onClick={() => setOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-nav-title"
          className="absolute inset-y-0 left-0 z-10 flex h-full w-[min(100%,18rem)] flex-col border-r bg-[color:var(--background)] shadow-2xl"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-3">
            <span id="mobile-nav-title" className="text-sm font-semibold text-slate-900">
              Navigation
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-xl border bg-white"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
            <div className="rounded-2xl border bg-white p-2 shadow-sm" onClick={() => setOpen(false)}>
              <NavList items={appNav} isAdmin={isAdmin} />
            </div>
            <div className="mt-3" onClick={() => setOpen(false)}>
              <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-amber-800/70">
                Empfehlen
              </p>
              <ReferMembershipNavCta />
            </div>
            <Link
              href="/punkte"
              onClick={() => setOpen(false)}
              className={cn(
                "mt-3 flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-blue-700 shadow-sm",
              )}
            >
              Statuspunkte — Übersicht
            </Link>
          </div>
        </aside>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        className="grid h-10 w-10 place-items-center rounded-xl border bg-white shadow-sm lg:hidden"
        aria-label="Menü öffnen"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </button>

      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}
