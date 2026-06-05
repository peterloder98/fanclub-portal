"use client";

import { useEffect, useState } from "react";
import {
  PREFERRED_CALENDAR_OPTIONS,
  normalizePreferredCalendar,
  type PreferredCalendar,
} from "@/lib/calendar/preferred-calendar";

const selectClass =
  "h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)] disabled:opacity-60";

export function PreferredCalendarSettings() {
  const [value, setValue] = useState<PreferredCalendar>("ask");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
    try {
      await fetch("/api/profile/calendar-preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference: v }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid max-w-md gap-3">
      <label className="grid gap-1">
        <span className="text-sm font-medium text-slate-700">Bevorzugter Kalender</span>
        <select
          value={value}
          disabled={loading || saving}
          onChange={(e) => void onChange(e.target.value as PreferredCalendar)}
          className={selectClass}
        >
          {PREFERRED_CALENDAR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-slate-500">
        {loading
          ? "Einstellung wird geladen…"
          : saving
            ? "Wird gespeichert…"
            : saved
              ? "Einstellung gespeichert."
              : "Änderungen werden automatisch übernommen."}
      </p>
    </div>
  );
}
