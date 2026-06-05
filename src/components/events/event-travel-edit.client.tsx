"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  clearEventTravelInfo,
  saveEventTravelInfo,
} from "@/app/(app)/events/actions";
import type { EventTravelInfo } from "@/lib/events/travel-info";
import type { TravelPlaceInput } from "@/lib/events/travel-info";

function emptyHotel(): TravelPlaceInput {
  return { name: "", address: "", link: "" };
}

function toInput(travel: EventTravelInfo | undefined) {
  return {
    station: travel?.station
      ? {
          name: travel.station.name,
          address: travel.station.address,
          link: travel.station.link ?? "",
        }
      : { name: "", address: "", link: "" },
    hotels:
      travel?.hotels?.length
        ? travel.hotels.map((h) => ({
            name: h.name,
            address: h.address,
            link: h.link ?? "",
          }))
        : [emptyHotel()],
    notes: travel?.notes ?? "",
  };
}

export function EventTravelEdit({
  eventId,
  initialTravel,
  compact = false,
}: {
  eventId: string;
  initialTravel?: EventTravelInfo;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => toInput(initialTravel));

  function handleSave() {
    setError(null);
    const station =
      form.station.name.trim() || form.station.address.trim() ? form.station : null;
    const hotels = form.hotels.filter((h) => h.name.trim() || h.address.trim());
    startTransition(async () => {
      try {
        await saveEventTravelInfo({
          eventId,
          travel: {
            station,
            hotels,
            notes: form.notes,
          },
        });
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setForm(toInput(initialTravel));
          setOpen(true);
        }}
        className={
          compact
            ? "inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            : "mt-2 text-xs font-semibold text-blue-700 hover:underline"
        }
      >
        {compact ? "Reiseinfos bearbeiten" : "Reiseinfos bearbeiten"}
      </button>
    );
  }

  return (
    <div
      className={
        compact
          ? "mt-2 w-full rounded-xl border border-blue-200 bg-blue-50/40 p-3"
          : "mt-2 rounded-xl border border-blue-200 bg-blue-50/40 p-3"
      }
    >
      <p className="text-xs font-semibold text-slate-800">Reise-Infos (nur Portal, nicht Artistflow)</p>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}

      <div className="mt-2 grid gap-2">
        <p className="text-[11px] font-semibold uppercase text-slate-500">Nächster Bahnhof</p>
        <input
          value={form.station.name}
          onChange={(e) => setForm((f) => ({ ...f, station: { ...f.station, name: e.target.value } }))}
          placeholder="Name"
          className="h-9 rounded-lg border px-2 text-xs"
        />
        <input
          value={form.station.address}
          onChange={(e) =>
            setForm((f) => ({ ...f, station: { ...f.station, address: e.target.value } }))
          }
          placeholder="Adresse"
          className="h-9 rounded-lg border px-2 text-xs"
        />

        <p className="mt-1 text-[11px] font-semibold uppercase text-slate-500">Hotels (max. 3)</p>
        {form.hotels.map((h, i) => (
          <div key={i} className="grid gap-1 rounded-lg border bg-white p-2">
            <input
              value={h.name}
              onChange={(e) => {
                const hotels = [...form.hotels];
                hotels[i] = { ...h, name: e.target.value };
                setForm((f) => ({ ...f, hotels }));
              }}
              placeholder="Hotelname"
              className="h-9 rounded-lg border px-2 text-xs"
            />
            <input
              value={h.address}
              onChange={(e) => {
                const hotels = [...form.hotels];
                hotels[i] = { ...h, address: e.target.value };
                setForm((f) => ({ ...f, hotels }));
              }}
              placeholder="Adresse"
              className="h-9 rounded-lg border px-2 text-xs"
            />
            <input
              value={h.link ?? ""}
              onChange={(e) => {
                const hotels = [...form.hotels];
                hotels[i] = { ...h, link: e.target.value };
                setForm((f) => ({ ...f, hotels }));
              }}
              placeholder="Link (optional)"
              className="h-9 rounded-lg border px-2 text-xs"
            />
          </div>
        ))}
        {form.hotels.length < 3 ? (
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, hotels: [...f.hotels, emptyHotel()] }))}
            className="text-left text-xs font-semibold text-blue-600"
          >
            + Hotel
          </button>
        ) : null}

        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Weitere Notizen (optional)"
          rows={2}
          className="rounded-lg border px-2 py-1 text-xs"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Berechne…" : "Speichern"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(false)}
          className="h-9 rounded-lg border px-3 text-xs font-semibold text-slate-600"
        >
          Abbrechen
        </button>
        {initialTravel ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Reise-Infos löschen?")) return;
              startTransition(async () => {
                await clearEventTravelInfo(eventId);
                setOpen(false);
                router.refresh();
              });
            }}
            className="h-9 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700"
          >
            Löschen
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        Entfernung und Gehzeit werden automatisch zu Fuß geschätzt (Location ↔ Adresse).
      </p>
    </div>
  );
}
