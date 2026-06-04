"use client";

import { useEffect, useState } from "react";
import {
  PREFERRED_CALENDAR_OPTIONS,
  normalizePreferredCalendar,
  type PreferredCalendar,
} from "@/lib/calendar/preferred-calendar";

export function PreferredCalendarSettings() {
  const [value, setValue] = useState<PreferredCalendar>("ask");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/profile/calendar-preference");
        if (res.ok) {
          const json = (await res.json()) as { preference?: string };
          setValue(normalizePreferredCalendar(json.preference));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onChange(v: PreferredCalendar) {
    setValue(v);
    setSaving(true);
    try {
      await fetch("/api/profile/calendar-preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference: v }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Standard-Kalender für Events</span>
      <p className="mt-0.5 text-xs text-slate-500">
        Gilt für dein Konto auf allen Geräten. Google/Outlook öffnen sich in einem kleinen Fenster.
      </p>
      <select
        value={value}
        disabled={loading || saving}
        onChange={(e) => void onChange(e.target.value as PreferredCalendar)}
        className="mt-2 w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
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
