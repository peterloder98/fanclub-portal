"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_MEMBER_EMAIL_PREFS,
  MEMBER_EMAIL_PREF_KEYS,
  type MemberEmailPrefKey,
  type MemberEmailPrefs,
} from "@/lib/email/member-email-prefs";

const PREF_LABELS: Record<
  MemberEmailPrefKey,
  { title: string; description: string }
> = {
  new_event: {
    title: "Neue Auftritte / Events",
    description: "E-Mail, wenn ein neuer Auftritt oder TV-Termin in der App erscheint.",
  },
  new_giveaway: {
    title: "Neue Gewinnspiele",
    description: "E-Mail, wenn ein neues Gewinnspiel startet.",
  },
  new_poll: {
    title: "Neue Umfragen",
    description: "E-Mail, wenn eine neue Umfrage startet.",
  },
  meeting_reminders: {
    title: "Fanclub-Treffen",
    description: "Erinnerungs-Mails vor Treffen, bei denen du zugesagt hast (7 und 2 Tage vorher).",
  },
  live: {
    title: "Live mit Anni",
    description: "Einladung und Erinnerung zu Live-Sessions mit Anni.",
  },
  app_activity: {
    title: "App-Erinnerungen",
    description: "Freundliche Erinnerung, wenn du die App länger nicht genutzt hast.",
  },
};

/** Anzeige-Reihenfolge in der UI */
const PREF_ORDER: MemberEmailPrefKey[] = [
  "new_event",
  "new_giveaway",
  "new_poll",
  "meeting_reminders",
  "live",
  "app_activity",
];

export function EmailNotificationSettings() {
  const [prefs, setPrefs] = useState<MemberEmailPrefs>(DEFAULT_MEMBER_EMAIL_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/profile/email-preferences");
        if (res.ok) {
          const json = (await res.json()) as { prefs?: MemberEmailPrefs };
          if (json.prefs) setPrefs({ ...DEFAULT_MEMBER_EMAIL_PREFS, ...json.prefs });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onToggle(key: MemberEmailPrefKey, enabled: boolean) {
    const next = { ...prefs, [key]: enabled };
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/profile/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs: next }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error || "Speichern fehlgeschlagen.");
        setPrefs(prefs);
        return;
      }
      setSaved(true);
    } catch {
      setError("Speichern fehlgeschlagen.");
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-slate-600">
        Wähle, welche optionalen E-Mails du erhalten möchtest. Änderungen werden sofort
        gespeichert.
      </p>

      <div className="grid gap-2">
        {PREF_ORDER.filter((k) => MEMBER_EMAIL_PREF_KEYS.includes(k)).map((key) => {
          const meta = PREF_LABELS[key];
          return (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[color:var(--fc-navy,#0b1f3a)]"
                checked={prefs[key]}
                disabled={loading || saving}
                onChange={(e) => void onToggle(key, e.target.checked)}
              />
              <span>
                <span className="font-medium text-fc-navy">{meta.title}</span>
                <span className="mt-0.5 block text-sm text-slate-600">{meta.description}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
        <strong>Immer an:</strong> Verwarnungen, Beitrags- und Zahlungserinnerungen,
        Zugangs-/Freigabe-Mails sowie Sicherheitsmeldungen (z. B. geänderte Login-E-Mail)
        kannst du nicht abschalten.
      </div>

      <p className="text-xs text-slate-500" role="status">
        {loading
          ? "Einstellungen werden geladen…"
          : error
            ? error
            : saving
              ? "Wird gespeichert…"
              : saved
                ? "Einstellungen gespeichert."
                : "Änderungen werden automatisch übernommen."}
      </p>
    </div>
  );
}
