"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClubMeeting } from "@/app/(app)/admin/treffen/actions";

export function MeetingAdminForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await createClubMeeting(fd);
            e.currentTarget.reset();
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Fehler");
          }
        });
      }}
    >
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-fc-navy">Titel</span>
        <input name="title" required className="h-10 rounded-xl border px-3" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-fc-navy">Kurzbeschreibung (Teaser)</span>
        <input name="summary" className="h-10 rounded-xl border px-3" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-fc-navy">Details</span>
        <textarea name="body" rows={4} className="rounded-xl border px-3 py-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-fc-navy">Ablauf / Plan</span>
        <textarea name="schedule" rows={3} className="rounded-xl border px-3 py-2" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-fc-navy">Beginn</span>
          <input
            name="starts_at"
            type="datetime-local"
            required
            className="h-10 rounded-xl border px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-fc-navy">Ort / Location</span>
          <input name="venue" className="h-10 rounded-xl border px-3" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-fc-navy">Adresse</span>
          <input name="address" className="h-10 rounded-xl border px-3" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-fc-navy">PLZ</span>
          <input name="postal_code" className="h-10 rounded-xl border px-3" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-fc-navy">Stadt</span>
          <input name="city" className="h-10 rounded-xl border px-3" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-fc-navy">Kosten pro Person (€)</span>
          <input
            name="cost_eur"
            inputMode="decimal"
            placeholder="z. B. 20"
            className="h-10 rounded-xl border px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-fc-navy">Kosten-Hinweis (optional)</span>
          <input
            name="cost_label"
            placeholder="z. B. inkl. Vesper"
            className="h-10 rounded-xl border px-3"
          />
        </label>
      </div>
      <label className="grid max-w-xs gap-1 text-sm">
        <span className="font-medium text-fc-navy">Zahlungsfrist (Tage nach Anmeldung)</span>
        <input
          name="payment_deadline_days"
          type="number"
          min={1}
          max={90}
          defaultValue={14}
          className="h-10 rounded-xl border px-3"
        />
        <span className="text-xs text-[color:var(--muted)]">
          Mitglied muss innerhalb dieser Frist zahlen; danach kann Admin die Anmeldung entfernen.
        </span>
      </label>
      <div className="rounded-xl border border-fc-ice bg-fc-ice/40 p-3">
        <p className="text-xs font-semibold text-fc-navy">Anreise & Unterkunft</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input name="station_name" placeholder="Bahnhof / Anreise" className="h-9 rounded-lg border px-2 text-sm" />
          <input name="station_address" placeholder="Adresse Anreise" className="h-9 rounded-lg border px-2 text-sm" />
          <input name="hotel_name" placeholder="Hotel-Empfehlung" className="h-9 rounded-lg border px-2 text-sm" />
          <input name="hotel_address" placeholder="Hotel-Adresse" className="h-9 rounded-lg border px-2 text-sm" />
        </div>
        <textarea
          name="travel_notes"
          rows={2}
          placeholder="Weitere Hinweise"
          className="mt-2 w-full rounded-lg border px-2 py-1.5 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="publish" defaultChecked />
        <span>Sofort veröffentlichen</span>
      </label>
      <button type="submit" disabled={pending} className="fc-btn-primary h-11 disabled:opacity-60">
        {pending ? "Speichern…" : "Treffen anlegen"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
