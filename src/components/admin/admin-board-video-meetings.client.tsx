"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  addBoardMeetingGuestsAction,
  cancelBoardVideoMeetingAction,
  createBoardVideoMeetingAction,
  endBoardVideoMeetingAction,
  removeBoardMeetingGuestAction,
  resendBoardMeetingGuestInviteAction,
  type AdminBoardMeetingRow,
  type AdminOption,
} from "@/app/(app)/admin/besprechung/actions";
import { AppDateTimeInput } from "@/components/ui/birthdate-segment-input";
import { formatBerlinDateTime, utcIsoToBerlinWallClock } from "@/lib/datetime/berlin";
import { cn } from "@/lib/cn";

function defaultStarts(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return utcIsoToBerlinWallClock(d.toISOString());
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Geplant",
  live: "Läuft",
  ended: "Beendet",
  cancelled: "Abgesagt",
};

type DraftGuest = { key: string; name: string; email: string };
type DraftAgenda = { key: string; text: string };

function newGuest(): DraftGuest {
  return { key: crypto.randomUUID(), name: "", email: "" };
}
function newAgenda(): DraftAgenda {
  return { key: crypto.randomUUID(), text: "" };
}

export function AdminBoardVideoMeetingsPanel({
  meetings,
  adminOptions,
  currentUserId,
}: {
  meetings: AdminBoardMeetingRow[];
  adminOptions: AdminOption[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("Besprechung mit Anni");
  const [startsAt, setStartsAt] = useState(defaultStarts);
  const [selected, setSelected] = useState<Set<string>>(() => new Set([currentUserId]));
  const [agendaDrafts, setAgendaDrafts] = useState<DraftAgenda[]>([newAgenda()]);
  const [guestDrafts, setGuestDrafts] = useState<DraftGuest[]>([newGuest()]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [createdLinks, setCreatedLinks] = useState<{ roomUrl: string; anniGuestUrl: string } | null>(
    null,
  );

  function toggleId(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function moveAgenda(index: number, dir: -1 | 1) {
    setAgendaDrafts((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next;
    });
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setCreatedLinks(null);
    startTransition(async () => {
      const result = await createBoardVideoMeetingAction({
        title,
        startsAt,
        participantUserIds: [...selected],
        sendInvites: true,
        agendaItems: agendaDrafts.map((a) => a.text),
        extraGuests: guestDrafts.map((g) => ({ name: g.name, email: g.email })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreatedLinks({ roomUrl: result.roomUrl, anniGuestUrl: result.anniGuestUrl });
      setInfo(
        "Einladungen werden versendet. Anni und Extra-Gäste erhalten ihren persönlichen Link (kein App-Zugang). Vorstände den Raum-Link (Login nötig). Max. 1 Stunde Video ab Start.",
      );
      setAgendaDrafts([newAgenda()]);
      setGuestDrafts([newGuest()]);
    });
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={onCreate} className="rounded-2xl border border-fc-navy/15 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-fc-navy">Neue Videobesprechung</h2>
        <p className="mt-1 text-sm text-slate-600">
          Anni ist immer dabei (E-Mail ohne Login). Agenda-Punkte und Extra-Gäste könnt ihr schon beim Anlegen
          eintragen. Video max. 1 Stunde, Raum 5 Min. vorher.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Titel</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl border border-fc-navy/15 px-3 py-2"
              maxLength={120}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Start (Berlin)</span>
            <AppDateTimeInput label="Start" value={startsAt} onChange={setStartsAt} />
          </label>
        </div>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-slate-700">Vorstände (Anni automatisch dabei)</legend>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {adminOptions.map((a) => (
              <li key={a.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-fc-navy/10 px-3 py-2 text-sm hover:bg-fc-ice/50">
                  <input
                    type="checkbox"
                    checked={selected.has(a.id)}
                    onChange={() => toggleId(a.id)}
                    className="rounded border-fc-navy/30"
                  />
                  <span>{a.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-slate-700">Agenda-Punkte (schon jetzt)</legend>
          <p className="mt-1 text-xs text-slate-500">
            Optional — könnt ihr später im Raum weiter ergänzen. Nicht erst 5 Minuten vorher.
          </p>
          <ul className="mt-2 grid gap-2">
            {agendaDrafts.map((row, i) => (
              <li key={row.key} className="flex items-center gap-2">
                <input
                  value={row.text}
                  onChange={(e) =>
                    setAgendaDrafts((prev) =>
                      prev.map((r) => (r.key === row.key ? { ...r, text: e.target.value.slice(0, 500) } : r)),
                    )
                  }
                  placeholder={`Punkt ${i + 1}`}
                  className="min-w-0 flex-1 rounded-xl border border-fc-navy/15 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => moveAgenda(i, -1)}
                  disabled={i === 0}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-fc-navy/10 text-slate-500 disabled:opacity-30"
                  aria-label="Nach oben"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveAgenda(i, 1)}
                  disabled={i === agendaDrafts.length - 1}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-fc-navy/10 text-slate-500 disabled:opacity-30"
                  aria-label="Nach unten"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAgendaDrafts((prev) => (prev.length <= 1 ? [newAgenda()] : prev.filter((r) => r.key !== row.key)))
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg border border-fc-navy/10 text-slate-500"
                  aria-label="Entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setAgendaDrafts((prev) => [...prev, newAgenda()])}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-fc-navy hover:underline"
          >
            <Plus className="h-4 w-4" />
            Punkt hinzufügen
          </button>
        </fieldset>

        <ExtraGuestsEditor
          guests={guestDrafts}
          onChange={setGuestDrafts}
          className="mt-5"
        />

        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        {info ? <p className="mt-3 text-sm text-emerald-700">{info}</p> : null}
        {createdLinks ? (
          <div className="mt-3 rounded-xl border border-fc-navy/10 bg-fc-ice/40 px-3 py-3 text-sm">
            <p>
              Raum:{" "}
              <Link href={createdLinks.roomUrl.replace(/^https?:\/\/[^/]+/, "")} className="font-semibold text-fc-navy underline">
                {createdLinks.roomUrl}
              </Link>
            </p>
            <p className="mt-1 break-all text-slate-600">Anni-Link (nur intern): {createdLinks.anniGuestUrl}</p>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 h-11 rounded-xl bg-fc-navy px-5 text-sm font-semibold text-white hover:bg-fc-blue disabled:opacity-60"
        >
          {pending ? "Lege an…" : "Anlegen & einladen"}
        </button>
      </form>

      <section className="rounded-2xl border border-fc-navy/15 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-fc-navy">Geplante & vergangene Besprechungen</h2>
        <ul className="mt-4 divide-y divide-fc-navy/10">
          {meetings.length === 0 ? (
            <li className="py-6 text-sm text-slate-500">Noch keine Videobesprechungen.</li>
          ) : (
            meetings.map((m) => (
              <MeetingRow key={m.id} meeting={m} pending={pending} startTransition={startTransition} />
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function ExtraGuestsEditor({
  guests,
  onChange,
  className,
}: {
  guests: DraftGuest[];
  onChange: (next: DraftGuest[]) => void;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="text-sm font-medium text-slate-700">Weitere Gäste (ohne App-Zugang)</legend>
      <p className="mt-1 text-xs text-slate-500">
        Name und E-Mail — beliebig viele. Jede Person bekommt einen eigenen Link nur für diesen Call, keinen
        Zugang zur Fanclub-App.
      </p>
      <ul className="mt-2 grid gap-2">
        {guests.map((row) => (
          <li key={row.key} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={row.name}
              onChange={(e) =>
                onChange(guests.map((g) => (g.key === row.key ? { ...g, name: e.target.value.slice(0, 80) } : g)))
              }
              placeholder="Name"
              className="rounded-xl border border-fc-navy/15 px-3 py-2 text-sm"
            />
            <input
              type="email"
              value={row.email}
              onChange={(e) =>
                onChange(guests.map((g) => (g.key === row.key ? { ...g, email: e.target.value } : g)))
              }
              placeholder="E-Mail"
              className="rounded-xl border border-fc-navy/15 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => onChange(guests.length <= 1 ? [newGuest()] : guests.filter((g) => g.key !== row.key))}
              className="grid h-10 w-10 place-items-center rounded-lg border border-fc-navy/10 text-slate-500"
              aria-label="Gast entfernen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...guests, newGuest()])}
        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-fc-navy hover:underline"
      >
        <Plus className="h-4 w-4" />
        Gast hinzufügen
      </button>
    </fieldset>
  );
}

function MeetingRow({
  meeting,
  pending,
  startTransition,
}: {
  meeting: AdminBoardMeetingRow;
  pending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [addGuests, setAddGuests] = useState<DraftGuest[]>([newGuest()]);
  const [rowError, setRowError] = useState<string | null>(null);
  const [rowInfo, setRowInfo] = useState<string | null>(null);
  const editable = meeting.status === "scheduled" || meeting.status === "live";

  return (
    <li className="py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-fc-navy">{meeting.title}</p>
          <p className="text-sm text-slate-600">
            {formatBerlinDateTime(meeting.starts_at)} ·{" "}
            <span className={cn(meeting.status === "live" && "text-rose-600 font-semibold")}>
              {STATUS_LABEL[meeting.status] ?? meeting.status}
            </span>
            {meeting.extraGuests.length ? ` · ${meeting.extraGuests.length} Extra-Gäste` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/besprechung/${meeting.slug}`}
            className="h-9 rounded-xl border border-fc-navy/15 px-3 text-sm font-semibold leading-9 text-fc-navy hover:bg-fc-ice"
          >
            Raum öffnen
          </Link>
          {editable ? (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="h-9 rounded-xl border border-fc-navy/15 px-3 text-sm font-semibold text-fc-navy hover:bg-fc-ice"
              >
                Gäste
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await endBoardVideoMeetingAction(meeting.id);
                  })
                }
                className="h-9 rounded-xl bg-rose-600 px-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                Beenden
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await cancelBoardVideoMeetingAction(meeting.id);
                  })
                }
                className="h-9 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Absagen
              </button>
            </>
          ) : null}
        </div>
      </div>
      {open && editable ? (
        <div className="mt-3 rounded-xl border border-fc-navy/10 bg-fc-ice/30 p-3">
          {meeting.extraGuests.length ? (
            <ul className="mb-3 divide-y divide-fc-navy/10 text-sm">
              {meeting.extraGuests.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium text-fc-navy">{g.name}</span>{" "}
                    <span className="text-slate-500">{g.email}</span>
                  </span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          setRowError(null);
                          const res = await resendBoardMeetingGuestInviteAction(meeting.id, g.id);
                          if (!res.ok) setRowError(res.error);
                          else setRowInfo("Neuer Link wurde versendet. Der alte Link gilt nicht mehr.");
                        })
                      }
                      className="text-xs font-semibold text-fc-navy underline disabled:opacity-50"
                    >
                      Link neu senden
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          setRowError(null);
                          const res = await removeBoardMeetingGuestAction(meeting.id, g.id);
                          if (!res.ok) setRowError(res.error);
                        })
                      }
                      className="text-xs font-semibold text-rose-700 underline disabled:opacity-50"
                    >
                      Entfernen
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-xs text-slate-500">Noch keine Extra-Gäste.</p>
          )}
          <ExtraGuestsEditor guests={addGuests} onChange={setAddGuests} />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setRowError(null);
                setRowInfo(null);
                const res = await addBoardMeetingGuestsAction({
                  meetingId: meeting.id,
                  guests: addGuests,
                });
                if (!res.ok) {
                  setRowError(res.error);
                  return;
                }
                setAddGuests([newGuest()]);
                setRowInfo(`${res.added} Einladung(en) werden versendet.`);
              })
            }
            className="mt-3 h-9 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            Gäste einladen
          </button>
          {rowError ? <p className="mt-2 text-sm text-rose-700">{rowError}</p> : null}
          {rowInfo ? <p className="mt-2 text-sm text-emerald-700">{rowInfo}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
