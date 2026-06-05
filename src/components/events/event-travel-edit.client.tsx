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
          link: "",
        }
      : { name: "", address: "", link: "" },
    hotels:
      travel?.hotels?.length
        ? travel.hotels.map((h) => ({
            name: h.name,
            address: h.address,
            link: "",
          }))
        : [emptyHotel()],
    notes: "",
  };
}

export function EventTravelEditForm({
  eventId,
  initialTravel,
  onClose,
}: {
  eventId: string;
  initialTravel?: EventTravelInfo;
  onClose: () => void;
}) {
  const router = useRouter();
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
          travel: { station, hotels, notes: "" },
        });
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      }
    });
  }

  return (
    <div className="border-t border-blue-200/80 bg-blue-50/30 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800">Reise-Infos</p>
        {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      </div>

      <div className="mt-2 grid gap-3 lg:grid-cols-2">
        <div className="grid gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Nächster Bahnhof
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <input
              value={form.station.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, station: { ...f.station, name: e.target.value } }))
              }
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
          </div>
        </div>

        <div className="grid gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Hotels (max. 3)
          </p>
          <div className="grid gap-1.5">
            {form.hotels.map((h, i) => (
              <div key={i} className="grid gap-1.5 sm:grid-cols-2">
                <input
                  value={h.name}
                  onChange={(e) => {
                    const hotels = [...form.hotels];
                    hotels[i] = { ...h, name: e.target.value };
                    setForm((f) => ({ ...f, hotels }));
                  }}
                  placeholder="Hotelname"
                  className="h-9 rounded-lg border bg-white px-2 text-xs"
                />
                <input
                  value={h.address}
                  onChange={(e) => {
                    const hotels = [...form.hotels];
                    hotels[i] = { ...h, address: e.target.value };
                    setForm((f) => ({ ...f, hotels }));
                  }}
                  placeholder="Adresse"
                  className="h-9 rounded-lg border bg-white px-2 text-xs"
                />
              </div>
            ))}
          </div>
          {form.hotels.length < 3 ? (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, hotels: [...f.hotels, emptyHotel()] }))}
              className="text-left text-xs font-semibold text-blue-600"
            >
              + Hotel
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="h-8 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Speichern…" : "Speichern"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onClose}
          className="h-8 rounded-lg border px-3 text-xs font-semibold text-slate-600"
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
                onClose();
                router.refresh();
              });
            }}
            className="h-8 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700"
          >
            Löschen
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Kompakter Trigger-Button für die Terminzeile. */
export function EventTravelEditTrigger({
  onClick,
  hasTravel,
}: {
  onClick: () => void;
  hasTravel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 shrink-0 items-center rounded-md border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
    >
      {hasTravel ? "Reiseinfos" : "Reiseinfos +"}
    </button>
  );
}
