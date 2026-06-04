"use client";

import { useEffect, useState } from "react";
import {
  getPreferredCalendar,
  PREFERRED_CALENDAR_OPTIONS,
  setPreferredCalendar,
  type PreferredCalendar,
} from "@/lib/calendar/preferred-calendar";

export function PreferredCalendarSettings() {
  const [value, setValue] = useState<PreferredCalendar>("ask");

  useEffect(() => {
    setValue(getPreferredCalendar());
  }, []);

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Standard-Kalender für Events</span>
      <p className="mt-0.5 text-xs text-slate-500">
        Beim Klick auf „In Kalender speichern“ öffnet sich direkt dein Kalender — ohne Auswahl-Dialog.
      </p>
      <select
        value={value}
        onChange={(e) => {
          const v = e.target.value as PreferredCalendar;
          setPreferredCalendar(v);
          setValue(v);
        }}
        className="mt-2 w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        {PREFERRED_CALENDAR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
