"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Train, Hotel, StickyNote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEventStart, formatLocation } from "@/lib/events/format";
import {
  clearEventAdminNote,
  saveEventAdminNote,
} from "@/app/(app)/admin/events/actions";
import type { EventAdminNote } from "@/lib/events/admin-notes";

export type AdminEventRow = {
  id: string;
  title: string;
  start_at: string | null;
  venue: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
};

function formatDE(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function EventAdminNotesPanel({
  events,
  notesByEventId,
  notesAvailable,
}: {
  events: AdminEventRow[];
  notesByEventId: Record<string, EventAdminNote>;
  notesAvailable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [forms, setForms] = useState<
    Record<string, { nextStation: string; nextHotel: string; notes: string }>
  >({});

  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        const ta = a.start_at ? new Date(a.start_at).getTime() : Number.MAX_SAFE_INTEGER;
        const tb = b.start_at ? new Date(b.start_at).getTime() : Number.MAX_SAFE_INTEGER;
        return ta - tb;
      }),
    [events],
  );

  function formFor(eventId: string) {
    const existing = notesByEventId[eventId];
    return (
      forms[eventId] ?? {
        nextStation: existing?.nextStation ?? "",
        nextHotel: existing?.nextHotel ?? "",
        notes: existing?.notes ?? "",
      }
    );
  }

  function setField(eventId: string, key: "nextStation" | "nextHotel" | "notes", value: string) {
    setForms((prev) => ({
      ...prev,
      [eventId]: { ...formFor(eventId), [key]: value },
    }));
  }

  function handleSave(eventId: string) {
    const f = formFor(eventId);
    setError(null);
    startTransition(async () => {
      try {
        await saveEventAdminNote({
          eventId,
          nextStation: f.nextStation,
          nextHotel: f.nextHotel,
          notes: f.notes,
        });
        setExpandedId(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      }
    });
  }

  function handleClear(eventId: string) {
    if (!window.confirm("Vorstand-Infos für dieses Event löschen?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await clearEventAdminNote(eventId);
        setForms((prev) => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
      }
    });
  }

  if (!notesAvailable) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-amber-800">
          Vorstand-Notizen noch nicht eingerichtet. Bitte{" "}
          <code className="rounded bg-amber-100 px-1">supabase/053_event_admin_notes.sql</code> im
          SQL Editor ausführen.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Event-Infos für den Vorstand</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Diese Angaben sind <strong>nur für Admins</strong> sichtbar und haben nichts mit den
          Artistflow-Daten zu tun. Nächster Bahnhof und Hotel helfen bei der Tour-Planung.
        </CardContent>
      </Card>

      {sortedEvents.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-slate-500">Noch keine Events synchronisiert.</CardContent>
        </Card>
      ) : (
        sortedEvents.map((e) => {
          const { date, time } = formatEventStart(e.start_at);
          const location = formatLocation(e);
          const note = notesByEventId[e.id];
          const hasNote = Boolean(note?.nextStation || note?.nextHotel || note?.notes);
          const open = expandedId === e.id;
          const f = formFor(e.id);

          return (
            <Card key={e.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div className="min-w-0">
                  <CardTitle className="text-base">{e.title}</CardTitle>
                  <p className="mt-1 text-xs text-slate-600">
                    {date}
                    {time ? ` · ${time} Uhr` : ""}
                    {location ? ` · ${location}` : ""}
                  </p>
                  {hasNote ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {note?.nextStation ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                          <Train className="h-3 w-3" aria-hidden />
                          {note.nextStation}
                        </span>
                      ) : null}
                      {note?.nextHotel ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                          <Hotel className="h-3 w-3" aria-hidden />
                          {note.nextHotel}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">Noch keine Vorstand-Infos</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : e.id)}
                  className="h-9 shrink-0 rounded-lg border bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {open ? "Schließen" : hasNote ? "Bearbeiten" : "Infos eintragen"}
                </button>
              </CardHeader>
              {open ? (
                <CardContent className="border-t pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Nächster Bahnhof</span>
                      <input
                        value={f.nextStation}
                        onChange={(ev) => setField(e.id, "nextStation", ev.target.value)}
                        placeholder="z. B. München Hbf"
                        className="h-10 rounded-xl border px-3 text-sm"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold text-slate-600">Nächstes Hotel</span>
                      <input
                        value={f.nextHotel}
                        onChange={(ev) => setField(e.id, "nextHotel", ev.target.value)}
                        placeholder="z. B. Hotel am See, 2 Nächte"
                        className="h-10 rounded-xl border px-3 text-sm"
                      />
                    </label>
                    <label className="grid gap-1 sm:col-span-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                        <StickyNote className="h-3.5 w-3.5" aria-hidden />
                        Weitere Notizen (optional)
                      </span>
                      <textarea
                        value={f.notes}
                        onChange={(ev) => setField(e.id, "notes", ev.target.value)}
                        placeholder="Parkplatz, Ansprechpartner, …"
                        rows={2}
                        className="rounded-xl border px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleSave(e.id)}
                      className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Speichern
                    </button>
                    {hasNote ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleClear(e.id)}
                        className="h-10 rounded-xl border px-4 text-sm font-semibold text-rose-700 disabled:opacity-50"
                      >
                        Infos löschen
                      </button>
                    ) : null}
                  </div>
                  {note?.updatedAt ? (
                    <p className="mt-2 text-[11px] text-slate-400">
                      Zuletzt geändert: {formatDE(note.updatedAt)}
                    </p>
                  ) : null}
                </CardContent>
              ) : null}
            </Card>
          );
        })
      )}
    </div>
  );
}
