"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBerlinDateTime } from "@/lib/datetime/berlin";
import { runArtistflowGeocodeBackfill, runArtistflowSync } from "./actions";

export type SyncLogSnapshot = {
  started_at: string;
  finished_at: string | null;
  total: number;
  inserted: number;
  updated: number;
  hidden: number;
  geocoding_queued: number;
  error: string | null;
};

export function EventsSyncPanel({
  initialLog,
  initialMessage,
}: {
  initialLog: SyncLogSnapshot | null;
  initialMessage?: { type: "ok" | "error"; text: string } | null;
}) {
  const router = useRouter();
  const [log, setLog] = useState(initialLog);
  const [message, setMessage] = useState(initialMessage ?? null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLog(initialLog);
  }, [initialLog]);

  const isRunning = Boolean(log?.started_at && !log?.finished_at);

  const poll = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!pending && !isRunning) return;
    const id = window.setInterval(poll, 1500);
    return () => window.clearInterval(id);
  }, [pending, isRunning, poll]);

  function runSync() {
    setMessage(null);
    startTransition(async () => {
      const result = await runArtistflowSync();
      if (result.ok) {
        setMessage({ type: "ok", text: "Sync erfolgreich abgeschlossen." });
        setLog(result.log);
      } else {
        setMessage({ type: "error", text: result.error });
      }
      router.refresh();
    });
  }

  function runGeocode() {
    setMessage(null);
    startTransition(async () => {
      const result = await runArtistflowGeocodeBackfill();
      if (result.ok) {
        setMessage({
          type: "ok",
          text: `Karten-Pins aktualisiert (${result.geocoded} neu geocodiert${result.relinked ? `, ${result.relinked} verknüpft` : ""}).`,
        });
      } else {
        setMessage({ type: "error", text: result.error });
      }
      router.refresh();
    });
  }

  const busy = pending || isRunning;

  return (
    <>
      {message ? (
        <div
          className={
            message.type === "ok"
              ? "mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              : "mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          }
        >
          {message.text}
        </div>
      ) : null}

      {busy ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          Sync läuft — Status wird automatisch aktualisiert…
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sync jetzt ausführen</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            <div className="grid gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={runSync}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {busy ? "Sync läuft…" : "Sync starten"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={runGeocode}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                Karten-Pins nachholen
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Unveränderte Events werden nicht überschrieben. Teilnahmen und Reiseinfos bleiben
              erhalten — nur bei Terminänderung werden Teilnehmer zurückgesetzt.
            </p>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              <p>
                Feed URL: <span className="font-mono">ARTISTFLOW_FEED_URL</span>
              </p>
              <p>
                Automatisch alle 2 Stunden per Cron sowie im Hintergrund auf Dashboard/Events
                (wenn älter als 2 Stunden).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Letzter Status</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            {log ? (
              <div className="grid gap-2">
                <div>
                  <span className="font-medium">Start:</span>{" "}
                  {formatBerlinDateTime(log.started_at, { withSeconds: true })}
                </div>
                <div>
                  <span className="font-medium">Ende:</span>{" "}
                  {log.finished_at
                    ? formatBerlinDateTime(log.finished_at, { withSeconds: true })
                    : "läuft…"}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="neutral" title="Einträge in termine.json">
                    Feed: {log.total}
                  </Badge>
                  <Badge variant="success" title="Neu im Portal angelegt">
                    neu: {log.inserted}
                  </Badge>
                  <Badge variant="brand" title="Bestehende Events mit Feed-Änderungen">
                    geändert: {log.updated}
                  </Badge>
                  <Badge
                    variant="warning"
                    title="Alte Portal-Events, die nicht mehr im Feed sind (ausgeblendet, nicht gelöscht)"
                  >
                    ausgeblendet: {log.hidden}
                  </Badge>
                  <Badge variant="neutral" title="Neu geocodierte Karten-Pins">
                    Pins: {log.geocoding_queued}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">ausgeblendet</span> = frühere
                  Duplikate oder Termine, die nicht mehr in der JSON-Datei stehen. Teilnahmen und
                  Reiseinfos bleiben an der alten Datensatz-ID erhalten, werden bei Duplikaten
                  automatisch verknüpft.
                </p>
                {log.error ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    {log.error}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-slate-600">Noch kein Sync gelaufen.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
