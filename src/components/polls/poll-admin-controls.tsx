"use client";

import { useState } from "react";
import { endPollEarly, deletePoll, updatePoll } from "@/app/(app)/polls/actions";

type PollOption = { id: string; label: string };

export function PollAdminControls({
  poll,
  options: initialOptions,
}: {
  poll: {
    id: string;
    question: string;
    allow_multiple: boolean;
    ends_at: string;
  };
  options: PollOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState(poll.question);
  const [allowMultiple, setAllowMultiple] = useState(poll.allow_multiple);
  const [options, setOptions] = useState(
    initialOptions.map((o) => ({ id: o.id, label: o.label })),
  );

  const endLocal = new Date(poll.ends_at);
  const endInput = new Date(endLocal.getTime() - endLocal.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  async function onEndEarly() {
    if (!window.confirm("Umfrage jetzt beenden?")) return;
    setBusy(true);
    setError(null);
    try {
      await endPollEarly(poll.id);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!window.confirm("Umfrage unwiderruflich löschen?")) return;
    setBusy(true);
    setError(null);
    try {
      await deletePoll(poll.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("options_json", JSON.stringify(options));
    if (allowMultiple) fd.set("allow_multiple", "on");
    else fd.delete("allow_multiple");
    try {
      await updatePoll(fd);
      setEditing(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onEndEarly()}
          className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-amber-900"
        >
          Vorzeitig beenden
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium"
        >
          {editing ? "Abbrechen" : "Bearbeiten"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDelete()}
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800"
        >
          Löschen
        </button>
      </div>

      {editing ? (
        <form onSubmit={(e) => void onSave(e)} className="mt-3 grid gap-2">
          <input type="hidden" name="poll_id" value={poll.id} />
          <input
            name="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            className="h-9 rounded-lg border px-2 text-sm"
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
            />
            Mehrfachauswahl
          </label>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600">Antworten</span>
            {options.map((o, i) => (
              <input
                key={o.id || `new-${i}`}
                value={o.label}
                onChange={(e) =>
                  setOptions((arr) =>
                    arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                  )
                }
                required
                className="h-9 w-full rounded-lg border px-2 text-sm"
              />
            ))}
            {options.length < 10 ? (
              <button
                type="button"
                className="text-xs font-medium text-blue-700"
                onClick={() => setOptions((arr) => [...arr, { id: "", label: "" }])}
              >
                + Option
              </button>
            ) : null}
          </div>
          <input
            name="ends_at"
            type="datetime-local"
            defaultValue={endInput}
            required
            className="h-9 rounded-lg border px-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-9 rounded-lg bg-slate-900 text-xs font-semibold text-white"
          >
            Speichern
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
