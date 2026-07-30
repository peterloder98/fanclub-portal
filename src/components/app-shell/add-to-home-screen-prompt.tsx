"use client";

import { useEffect, useState } from "react";
import { Share, MoreVertical, Plus, X } from "lucide-react";

const STORAGE_KEY = "fc_add_home_dismissed_v1";

function isStandaloneDisplay() {
  if (typeof window === "undefined") return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function AddToHomeScreenPrompt() {
  const [open, setOpen] = useState(false);
  const ios = isIos();

  useEffect(() => {
    try {
      if (isStandaloneDisplay()) return;
      if (!isMobileViewport()) return;
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
      const t = window.setTimeout(() => setOpen(true), 1200);
      return () => window.clearTimeout(t);
    } catch {
      // ignore
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      role="dialog"
      aria-labelledby="add-home-title"
      aria-modal="true"
    >
      <div className="mx-auto max-w-lg rounded-2xl border border-fc-navy/15 bg-white p-4 shadow-xl shadow-fc-navy/15">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="add-home-title" className="text-base font-semibold text-fc-navy">
              App auf dem Home-Bildschirm
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              So hast du die Fanclub-App wie eine normale App immer griffbereit — ohne App Store.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-fc-ice"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {ios ? (
          <ol className="mt-3 space-y-2 text-sm text-fc-navy">
            <li className="flex gap-2">
              <span className="font-semibold text-fc-blue">1.</span>
              <span className="inline-flex flex-wrap items-center gap-1">
                Tippe unten auf{" "}
                <span className="inline-flex items-center gap-1 rounded-md bg-fc-ice px-1.5 py-0.5 font-medium">
                  <Share className="h-3.5 w-3.5" aria-hidden /> Teilen
                </span>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-fc-blue">2.</span>
              <span className="inline-flex flex-wrap items-center gap-1">
                Wähle{" "}
                <span className="inline-flex items-center gap-1 rounded-md bg-fc-ice px-1.5 py-0.5 font-medium">
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Zum Home-Bildschirm
                </span>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-fc-blue">3.</span>
              <span>Mit „Hinzufügen“ bestätigen.</span>
            </li>
          </ol>
        ) : (
          <ol className="mt-3 space-y-2 text-sm text-fc-navy">
            <li className="flex gap-2">
              <span className="font-semibold text-fc-blue">1.</span>
              <span className="inline-flex flex-wrap items-center gap-1">
                Tippe auf{" "}
                <span className="inline-flex items-center gap-1 rounded-md bg-fc-ice px-1.5 py-0.5 font-medium">
                  <MoreVertical className="h-3.5 w-3.5" aria-hidden /> Menü
                </span>{" "}
                (drei Punkte)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-fc-blue">2.</span>
              <span>
                Wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-fc-blue">3.</span>
              <span>Bestätigen — fertig.</span>
            </li>
          </ol>
        )}

        <button
          type="button"
          onClick={dismiss}
          className="mt-4 h-10 w-full rounded-xl bg-fc-navy text-sm font-semibold text-white"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
