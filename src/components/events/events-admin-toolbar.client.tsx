"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2, Wrench } from "lucide-react";
import { runRestoreEventsFromFeed } from "@/app/(app)/admin/events-sync/actions";

export function EventsAdminToolbar() {
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function runRestore() {
    setMessage(null);
    startTransition(async () => {
      const result = await runRestoreEventsFromFeed();
      if (result.ok) {
        setMessage({
          type: "ok",
          text: `${result.restored} von ${result.feedTotal} Events wieder sichtbar.`,
        });
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  return (
    <div className="mb-3 shrink-0 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-950">
          <Wrench className="h-4 w-4" aria-hidden />
          Admin · Events
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => runRestore()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500 bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          Events wiederherstellen
        </button>
        <Link
          href="/admin/events-sync"
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Artistflow Sync
        </Link>
      </div>
      <p className="mt-2 text-xs text-amber-900/80">
        Wenn Events fehlen: „Events wiederherstellen“. Für fehlende Teilnehmer oder Pins: Artistflow
        Sync öffnen.
      </p>
      {message ? (
        <p
          className={
            message.type === "ok"
              ? "mt-2 text-xs font-medium text-emerald-800"
              : "mt-2 text-xs font-medium text-rose-800"
          }
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
