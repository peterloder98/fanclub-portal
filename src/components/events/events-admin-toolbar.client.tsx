"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2, Wrench } from "lucide-react";
import { runPortalEventRepair } from "@/app/(app)/admin/events-sync/actions";

export function EventsAdminToolbar() {
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function runRepair() {
    setMessage(null);
    startTransition(async () => {
      const result = await runPortalEventRepair();
      if (result.ok) {
        const parts = [
          result.groupsMerged
            ? `${result.groupsMerged} Duplikat-Gruppe(n) zusammengeführt`
            : null,
          result.participationsMoved
            ? `${result.participationsMoved} Teilnahme(n) wiederhergestellt`
            : null,
          result.travelNotesMoved
            ? `${result.travelNotesMoved} Reiseinfo(s) wiederhergestellt`
            : null,
          result.pinsRestored + result.geocoded
            ? `${result.pinsRestored + result.geocoded} Karten-Pin(s) gesetzt`
            : null,
        ]
          .filter(Boolean)
          .join(", ");
        setMessage({
          type: "ok",
          text: parts || "Reparatur abgeschlossen — keine Änderungen nötig.",
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
          onClick={() => runRepair()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 text-xs font-semibold text-amber-950 shadow-sm hover:bg-amber-100 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          Teilnehmer & Pins reparieren
        </button>
        <Link
          href="/admin/events-sync"
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Artistflow Sync
        </Link>
      </div>
      <p className="mt-2 text-xs text-amber-900/80">
        Wenn nach einem Sync Teilnehmer, Reiseinfos oder Karten-Pins fehlen: Reparatur ausführen.
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
