"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClubMeeting } from "@/app/(app)/admin/treffen/actions";
import { AppDateTimeInput } from "@/components/ui/birthdate-segment-input";
import {
  decimalInputProps,
  integerInputProps,
  sanitizeDecimalInput,
  sanitizeDigitsInput,
} from "@/lib/input/decimal-input";
import { berlinWallClockNowPlus } from "@/lib/datetime/berlin";

function defaultStarts(): string {
  // Nächste volle Stunde + 2h, Berlin-Wanduhr für AppDateTimeInput
  const wall = berlinWallClockNowPlus(2 * 60 * 60 * 1000);
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):/.exec(wall);
  if (!m) return wall;
  return `${m[1]}T${m[2]}:00`;
}

const fieldClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]";
const areaClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]";

export function MeetingAdminForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [schedule, setSchedule] = useState("");
  const [startsAt, setStartsAt] = useState(defaultStarts);
  const [endsAt, setEndsAt] = useState("");
  const [withEnd, setWithEnd] = useState(false);
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [withCosts, setWithCosts] = useState(false);
  const [costEur, setCostEur] = useState("");
  const [costLabel, setCostLabel] = useState("");
  const [paymentDeadlineDays, setPaymentDeadlineDays] = useState("14");
  const [stationName, setStationName] = useState("");
  const [stationAddress, setStationAddress] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [travelNotes, setTravelNotes] = useState("");
  const [publish, setPublish] = useState(true);

  function resetForm() {
    setTitle("");
    setSummary("");
    setBody("");
    setSchedule("");
    setStartsAt(defaultStarts());
    setEndsAt("");
    setWithEnd(false);
    setVenue("");
    setAddress("");
    setPostalCode("");
    setCity("");
    setWithCosts(false);
    setCostEur("");
    setCostLabel("");
    setPaymentDeadlineDays("14");
    setStationName("");
    setStationAddress("");
    setHotelName("");
    setHotelAddress("");
    setTravelNotes("");
    setPublish(true);
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createClubMeeting({
            title,
            summary,
            body,
            schedule,
            startsAt,
            endsAt: withEnd ? endsAt : null,
            venue,
            address,
            postalCode,
            city,
            withCosts,
            costEur: withCosts ? costEur : "",
            costLabel: withCosts ? costLabel : "",
            paymentDeadlineDays: withCosts ? paymentDeadlineDays : "14",
            stationName,
            stationAddress,
            hotelName,
            hotelAddress,
            travelNotes,
            publish,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          resetForm();
          router.refresh();
        });
      }}
    >
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-fc-navy">Titel</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-fc-navy">Kurzbeschreibung (Teaser)</span>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-fc-navy">Details</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className={areaClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-fc-navy">Ablauf / Plan</span>
        <textarea
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          rows={3}
          className={areaClass}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <AppDateTimeInput label="Beginn" value={startsAt} onChange={setStartsAt} required />
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-fc-navy">Ort / Location</span>
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-fc-navy">
        <input
          type="checkbox"
          checked={withEnd}
          onChange={(e) => {
            const on = e.target.checked;
            setWithEnd(on);
            if (on && !endsAt) setEndsAt(startsAt);
          }}
          className="h-4 w-4 rounded border-slate-300 text-fc-blue focus:ring-fc-blue"
        />
        <span className="font-medium">Ende angeben (optional)</span>
      </label>
      {withEnd ? (
        <AppDateTimeInput label="Ende" value={endsAt} onChange={setEndsAt} required />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-fc-navy">Adresse</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-fc-navy">PLZ</span>
          <input
            value={postalCode}
            onChange={(e) => setPostalCode(sanitizeDigitsInput(e.target.value, 10))}
            {...integerInputProps()}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="grid max-w-sm gap-1 text-sm">
        <span className="font-medium text-fc-navy">Stadt</span>
        <input value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass} />
      </label>

      <div className="rounded-xl border border-fc-ice bg-fc-ice/30 p-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-fc-navy">
          <input
            type="checkbox"
            checked={withCosts}
            onChange={(e) => setWithCosts(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-fc-blue focus:ring-fc-blue"
          />
          <span className="font-semibold">Kosten für das Fantreffen</span>
        </label>
        {withCosts ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-fc-navy">Betrag pro Person (€)</span>
              <input
                value={costEur}
                onChange={(e) => setCostEur(sanitizeDecimalInput(e.target.value))}
                placeholder="z. B. 20"
                className={fieldClass}
                {...decimalInputProps()}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-fc-navy">Kosten-Hinweis</span>
              <input
                value={costLabel}
                onChange={(e) => setCostLabel(e.target.value)}
                placeholder="z. B. inkl. Vesper"
                className={fieldClass}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-fc-navy">Zahlungsfrist (Tage)</span>
              <input
                value={paymentDeadlineDays}
                onChange={(e) =>
                  setPaymentDeadlineDays(sanitizeDigitsInput(e.target.value, 2) || "")
                }
                className={fieldClass}
                {...integerInputProps()}
              />
              <span className="text-xs text-[color:var(--muted)]">
                Nach Anmeldung; danach kann der Vorstand die Anmeldung entfernen.
              </span>
            </label>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            Ohne Haken: kostenloses Treffen — keine Betragsfelder.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-fc-ice bg-fc-ice/40 p-3">
        <p className="text-xs font-semibold text-fc-navy">Anreise & Unterkunft</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            value={stationName}
            onChange={(e) => setStationName(e.target.value)}
            placeholder="Bahnhof / Anreise"
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
          />
          <input
            value={stationAddress}
            onChange={(e) => setStationAddress(e.target.value)}
            placeholder="Adresse Anreise"
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
          />
          <input
            value={hotelName}
            onChange={(e) => setHotelName(e.target.value)}
            placeholder="Hotel-Empfehlung"
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
          />
          <input
            value={hotelAddress}
            onChange={(e) => setHotelAddress(e.target.value)}
            placeholder="Hotel-Adresse"
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
          />
        </div>
        <textarea
          value={travelNotes}
          onChange={(e) => setTravelNotes(e.target.value)}
          rows={2}
          placeholder="Weitere Hinweise"
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => setPublish(e.target.checked)}
        />
        <span>Sofort veröffentlichen</span>
      </label>
      <button type="submit" disabled={pending} className="fc-btn-primary h-11 disabled:opacity-60">
        {pending ? "Speichern…" : "Treffen anlegen"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
