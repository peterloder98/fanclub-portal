"use client";

import { useEffect, useState } from "react";
import { Share, Plus, X, Download } from "lucide-react";

const STORAGE_KEY = "fc_add_home_dismissed_v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

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

function registerMinimalServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("/sw.js").catch(() => {});
}

export function AddToHomeScreenPrompt() {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const ios = isIos();

  useEffect(() => {
    registerMinimalServiceWorker();

    try {
      if (isStandaloneDisplay()) return;
      if (!isMobileViewport()) return;
      if (localStorage.getItem(STORAGE_KEY) === "1") return;

      const onBip = (e: Event) => {
        e.preventDefault();
        setDeferred(e as BeforeInstallPromptEvent);
      };
      window.addEventListener("beforeinstallprompt", onBip);

      const t = window.setTimeout(() => setOpen(true), 1400);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBip);
      };
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

  async function installNow() {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "accepted") dismiss();
    } catch {
      // Browser hat abgebrochen — Anleitung bleibt sichtbar
    } finally {
      setInstalling(false);
    }
  }

  if (!open) return null;

  const canOneTap = Boolean(deferred) && !ios;

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
              Als Icon „Anni Perka Fanclub“ — wie eine normale App, ohne App Store.
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

        {canOneTap ? (
          <>
            <p className="mt-3 text-sm text-slate-600">
              Ein Tippen genügt — dein Handy fragt kurz nach, dann liegt die App auf dem
              Startbildschirm.
            </p>
            <button
              type="button"
              disabled={installing}
              onClick={() => void installNow()}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-fc-navy text-sm font-semibold text-white disabled:opacity-60"
            >
              <Download className="h-4 w-4" aria-hidden />
              {installing ? "Wird vorbereitet…" : "Jetzt installieren"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="mt-2 h-9 w-full text-sm font-medium text-slate-500"
            >
              Später
            </button>
          </>
        ) : ios ? (
          <>
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-950">
              Auf dem iPhone erlaubt Apple keine Ein-Klick-Installation aus der Website.
              Du musst einmal den Teilen-Button nutzen — dauert ca. 10 Sekunden.
            </p>
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
                <span>
                  Name prüfen („Anni Perka Fanclub“) und mit „Hinzufügen“ bestätigen.
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={dismiss}
              className="mt-4 h-10 w-full rounded-xl bg-fc-navy text-sm font-semibold text-white"
            >
              Verstanden
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-slate-600">
              Wenn dein Browser den Installieren-Button anbietet, tippe darauf. Sonst:
            </p>
            <ol className="mt-3 space-y-2 text-sm text-fc-navy">
              <li className="flex gap-2">
                <span className="font-semibold text-fc-blue">1.</span>
                <span>Menü öffnen (drei Punkte).</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-fc-blue">2.</span>
                <span>„App installieren“ / „Zum Startbildschirm hinzufügen“.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-fc-blue">3.</span>
                <span>Bestätigen — Icon heißt „Anni Perka Fanclub“.</span>
              </li>
            </ol>
            <button
              type="button"
              onClick={dismiss}
              className="mt-4 h-10 w-full rounded-xl bg-fc-navy text-sm font-semibold text-white"
            >
              Verstanden
            </button>
          </>
        )}
      </div>
    </div>
  );
}
