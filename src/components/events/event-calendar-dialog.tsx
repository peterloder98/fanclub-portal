"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import { openEventInPreferredCalendar } from "@/lib/calendar/open-event-calendar";
import {
  buildGoogleCalendarUrl,
  buildOutlookOfficeUrl,
  buildOutlookWebUrl,
} from "@/lib/calendar/event-calendar-links";
import { formatLocation } from "@/lib/events/format";
import {
  getPreferredCalendar,
  PREFERRED_CALENDAR_OPTIONS,
  setPreferredCalendar,
  type PreferredCalendar,
} from "@/lib/calendar/preferred-calendar";

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
  const outlookOfficeUrl = useMemo(() => buildOutlookOfficeUrl(payload), [payload]);

  useEffect(() => {
    if (!open) return;
    setStoredPref(preferredCalendarProp ?? getPreferredCalendar());
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, preferredCalendarProp]);

  function openOnce(pref: PreferredCalendar) {
    const result = openEventInPreferredCalendar(pref, payload, title);
    if (!result.ok && result.message !== "ask") {
      window.alert(result.message);
      return;
    }
    if (result.ok) onClose();
  }

  function onDefaultChange(value: string) {
    const pref = value as PreferredCalendar;
    setPreferredCalendar(pref);
    setStoredPref(pref);
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
            ? "Kalender wählen — unten kannst du einen Standard festlegen, dann reicht ein Klick auf den Button."
            : "Oder einmalig einen anderen Kalender wählen:"}
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
              Outlook (privat)
            </button>
          ) : null}
          {outlookOfficeUrl ? (
            <button
              type="button"
              onClick={() => openOnce("outlook-office")}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#0078d4] bg-white text-sm font-semibold text-[#0078d4]"
            >
              Outlook (Arbeit/Schule)
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openOnce("apple")}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <Download className="h-4 w-4" aria-hidden />
            Apple / andere (Datei)
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-slate-600">Standard-Kalender für Events</span>
          <select
            value={storedPref}
            onChange={(e) => onDefaultChange(e.target.value)}
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
          Einstellung gilt in diesem Browser. iPhone/Mac: Apple → Datei → „Zum Kalender hinzufügen“
        </p>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
