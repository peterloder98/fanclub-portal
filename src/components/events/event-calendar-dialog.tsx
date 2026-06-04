"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import {
  openEventInPreferredCalendar,
  openGoogleCalendarPopup,
} from "@/lib/calendar/open-event-calendar";
import { buildGoogleCalendarUrl, buildOutlookWebUrl } from "@/lib/calendar/event-calendar-links";
import { formatLocation } from "@/lib/events/format";
import {
  PREFERRED_CALENDAR_OPTIONS,
  normalizePreferredCalendar,
  type PreferredCalendar,
} from "@/lib/calendar/preferred-calendar";

async function saveCalendarPreference(pref: PreferredCalendar) {
  await fetch("/api/profile/calendar-preference", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preference: pref }),
  });
}

export function EventCalendarDialog({
  open,
  onClose,
  title,
  startAt,
  venue,
  address,
  postalCode,
  city,
  preferredCalendar: preferredCalendarProp,
  onPreferenceChange,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  startAt: string;
  venue?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  preferredCalendar?: PreferredCalendar;
  onPreferenceChange?: (pref: PreferredCalendar) => void;
}) {
  const [storedPref, setStoredPref] = useState<PreferredCalendar>("ask");

  const payload = useMemo(() => {
    const location = formatLocation({
      venue,
      address,
      postal_code: postalCode,
      city,
    });
    return {
      title,
      startAt,
      location: location ?? undefined,
      description: `Anni Perka Fanclub — ${title}`,
    };
  }, [title, startAt, venue, address, postalCode, city]);

  const googleUrl = useMemo(() => buildGoogleCalendarUrl(payload), [payload]);
  const outlookUrl = useMemo(() => buildOutlookWebUrl(payload), [payload]);

  useEffect(() => {
    if (!open) return;
    setStoredPref(normalizePreferredCalendar(preferredCalendarProp));
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, preferredCalendarProp]);

  function openOnce(pref: PreferredCalendar) {
    if (pref === "google" && googleUrl) {
      openGoogleCalendarPopup(googleUrl);
      onClose();
      return;
    }
    const result = openEventInPreferredCalendar(pref, payload, title);
    if (!result.ok && result.message !== "ask") {
      window.alert(result.message);
      return;
    }
    if (result.ok) onClose();
  }

  async function onDefaultChange(value: string) {
    const pref = value as PreferredCalendar;
    setStoredPref(pref);
    onPreferenceChange?.(pref);
    try {
      await saveCalendarPreference(pref);
    } catch {
      /* ignore */
    }
  }

  if (!open || typeof document === "undefined") return null;

  const modal = (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-cal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border bg-white p-4 shadow-2xl shadow-slate-900/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id="event-cal-title" className="text-base font-semibold text-slate-900">
              In Kalender speichern
            </h2>
            <p className="mt-1 truncate text-sm text-slate-600">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-slate-600"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {storedPref === "ask"
            ? "Kalender wählen — unten kannst du einen Standard für dein Konto festlegen."
            : "Oder einmalig einen anderen Kalender:"}
        </p>

        <div className="mt-4 grid gap-2">
          {googleUrl ? (
            <button
              type="button"
              onClick={() => openOnce("google")}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1a73e8] text-sm font-semibold text-white"
            >
              Google Kalender
            </button>
          ) : null}
          {outlookUrl ? (
            <button
              type="button"
              onClick={() => openOnce("outlook")}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0078d4] text-sm font-semibold text-white"
            >
              Outlook
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openOnce("ics")}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <Download className="h-4 w-4" aria-hidden />
            .ics-Datei für deine App
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-slate-600">Standard-Kalender (dein Konto)</span>
          <select
            value={storedPref}
            onChange={(e) => void onDefaultChange(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
          >
            {PREFERRED_CALENDAR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <p className="mt-2 text-center text-[10px] text-slate-400">
          Google/Outlook öffnen in einem kleinen Fenster · .ics: Datei antippen → „Zum Kalender hinzufügen“
        </p>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
