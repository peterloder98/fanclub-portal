"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBerlinDateTime } from "@/lib/datetime/berlin";
import {
  runArtistflowGeocodeBackfill,
  runArtistflowSync,
  runPortalEventRepair,
  runRestoreEventsFromFeed,
} from "./actions";

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
          text: `Karten-Pins aktualisiert (${result.geocoded} Pins${result.relinked ? `, ${result.relinked} verknüpft` : ""}).`,
        });
      } else {
        setMessage({ type: "error", text: result.error });
      }
      router.refresh();
    });
  }

  function runRestore() {
    setMessage(null);
    startTransition(async () => {
      const result = await runRestoreEventsFromFeed();
      if (result.ok) {
        setMessage({
          type: "ok",
          text: `${result.restored} von ${result.feedTotal} Events aus dem Feed wieder sichtbar${result.inserted ? ` (${result.inserted} neu angelegt)` : ""}${result.participationsMoved ? `, ${result.participationsMoved} Teilnahme(n) verknüpft` : ""}.`,
        });
      } else {
        setMessage({ type: "error", text: result.error });
      }
      router.refresh();
    });
  }

  function runRepair() {
    setMessage(null);
    startTransition(async () => {
      const result = await runPortalEventRepair();
      if (result.ok) {
        const parts = [
          result.participationsMoved
            ? `${result.participationsMoved} Teilnahme(n) verknüpft`
            : null,
          result.travelNotesMoved
            ? `${result.travelNotesMoved} Reiseinfo(s) verknüpft`
            : null,
          result.pinsRestored + result.geocoded
            ? `${result.pinsRestored + result.geocoded} Karten-Pin(s) gesetzt`
            : null,
        ]
          .filter(Boolean)
          .join(", ");
        setMessage({
          type: "ok",
          text: parts || "Verknüpfung abgeschlossen — keine Änderungen nötig.",
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
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-fc-sky/30 bg-fc-ice px-4 py-3 text-sm text-fc-navy">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          Sync läuft — Status wird automatisch aktualisiert…
        </div>
      ) : null}

      <Card className="mb-4 border-2 border-emerald-300 bg-emerald-50/90 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-emerald-950">
            <Wrench className="h-5 w-5 shrink-0" aria-hidden />
            Events aus Feed wiederherstellen
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-emerald-950">
          <p>
            Stellt alle Termine aus <strong>termine.json</strong> wieder sichtbar her — ohne Events
            zu löschen. Teilnahmen und Reiseinfos bleiben erhalten und werden verknüpft.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={runRestore}
            className="inline-flex h-12 w-full max-w-md items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 bg-emerald-600 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Alle Events wiederherstellen
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={runRepair}
            className="inline-flex h-10 w-full max-w-md items-center justify-center gap-2 rounded-xl border border-emerald-400 bg-white text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
          >
            Nur Teilnehmer & Pins verknüpfen
          </button>
        </CardContent>
      </Card>

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
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-fc-navy text-sm font-semibold text-white shadow-sm hover:bg-fc-blue disabled:opacity-60"
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
            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-xs text-emerald-950">
              <p className="font-semibold">Sync ist sicher — nichts wird gelöscht</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-emerald-900">
                <li>Events werden <strong>nicht gelöscht</strong>, nur bei Bedarf ausgeblendet.</li>
                <li>
                  <strong>Teilnahmen & Reiseinfos</strong> bleiben erhalten und werden automatisch
                  verknüpft.
                </li>
                <li>
                  Unveränderte Termine werden <strong>übersprungen</strong> (kein Datenverlust).
                </li>
                <li>
                  Nur wenn sich ein <strong>Datum</strong> im Feed ändert, werden Teilnehmer für
                  diesen einen Termin zurückgesetzt.
                </li>
              </ul>
            </div>
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

      <Card className="mt-4 border-fc-sky/30 bg-fc-ice/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-fc-navy">Benachrichtigungen testen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-fc-navy">
          <p>
            Mitglieder (und Admins) erhalten eine Glocke-Benachrichtigung, wenn ein Event{" "}
            <strong>neu sichtbar</strong> wird — z. B. frisch aus dem Feed oder nach
            Wiederherstellung.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-fc-navy">
            <li>
              <strong>Sync starten</strong> (nicht nur „Verknüpfen“) und im Status prüfen:{" "}
              <code className="rounded bg-white/80 px-1">neu</code> oder sichtbar gewordene Events.
            </li>
            <li>
              In Supabase:{" "}
              <code className="rounded bg-white/80 px-1">
                SELECT kind, title, created_at FROM user_notifications WHERE kind =
                &apos;event_available&apos; ORDER BY created_at DESC LIMIT 10
              </code>
            </li>
            <li>
              Als aktives Mitglied einloggen → Glocke öffnen (Badge erscheint spätestens nach 30 s
              oder sofort beim Öffnen).
            </li>
            <li>
              Bereits benachrichtigte Events werden nicht erneut gemeldet (gleiche Event-ID).
            </li>
          </ol>
          <p className="text-xs text-fc-blue">
            Hinweis: Benachrichtigungen gehen an <strong>aktive Mitgliedschaften</strong> (Admins
            inklusive nach Migration 065). Die Tabelle{" "}
            <code className="rounded bg-white/80 px-1">user_notifications</code> muss existieren
            (Migration 059).
          </p>
        </CardContent>
      </Card>
    </>
  );
}
