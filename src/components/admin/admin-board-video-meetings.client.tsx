"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  cancelBoardVideoMeetingAction,
  createBoardVideoMeetingAction,
  endBoardVideoMeetingAction,
  type AdminOption,
} from "@/app/(app)/admin/besprechung/actions";
import type { BoardVideoMeetingRow } from "@/lib/board-video/types";
import { boardMeetingRoomUrl } from "@/lib/board-video/types";
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

export function AdminBoardVideoMeetingsPanel({
  meetings,
  adminOptions,
  currentUserId,
}: {
  meetings: BoardVideoMeetingRow[];
  adminOptions: AdminOption[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("Besprechung mit Anni");
  const [startsAt, setStartsAt] = useState(defaultStarts);
  const [selected, setSelected] = useState<Set<string>>(() => new Set([currentUserId]));
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
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreatedLinks({ roomUrl: result.roomUrl, anniGuestUrl: result.anniGuestUrl });
      setInfo(
        "Einladungen werden versendet. Anni erhält ihren persönlichen Link, Vorstände den Raum-Link (Login nötig). Max. 1 Stunde Video ab Start.",
      );
    });
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={onCreate} className="rounded-2xl border border-fc-navy/15 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-fc-navy">Neue Videobesprechung</h2>
        <p className="mt-1 text-sm text-slate-600">
          Anni ist immer dabei (E-Mail ohne Login). Vorstände wählen — Raum 5 Min. vorher, Video max. 1 Stunde.
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
              <li key={m.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-fc-navy">{m.title}</p>
                  <p className="text-sm text-slate-600">
                    {formatBerlinDateTime(m.starts_at)} ·{" "}
                    <span className={cn(m.status === "live" && "text-rose-600 font-semibold")}>
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/besprechung/${m.slug}`}
                    className="h-9 rounded-xl border border-fc-navy/15 px-3 text-sm font-semibold leading-9 text-fc-navy hover:bg-fc-ice"
                  >
                    Raum öffnen
                  </Link>
                  {m.status === "scheduled" || m.status === "live" ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await endBoardVideoMeetingAction(m.id);
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
                            await cancelBoardVideoMeetingAction(m.id);
                          })
                        }
                        className="h-9 rounded-xl border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Absagen
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
