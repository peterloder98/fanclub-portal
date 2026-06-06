"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { endPollEarly, deletePoll, updatePoll } from "@/app/(app)/polls/actions";

type PollOption = { id: string; label: string };

export function PollAdminControls({
  poll,
  ended = false,
  options: initialOptions,
  voteCountByOptionId = {},
}: {
  poll: {
    id: string;
    question: string;
    allow_multiple: boolean;
    ends_at: string;
  };
  ended?: boolean;
  options: PollOption[];
  /** Stimmen pro Antwortoption — Löschen nur ohne Stimmen, Text immer korrigierbar. */
  voteCountByOptionId?: Record<string, number>;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState(poll.question);
  const [allowMultiple, setAllowMultiple] = useState(poll.allow_multiple);
  const allowMultipleLocked = poll.allow_multiple;
  const [options, setOptions] = useState(
    initialOptions.map((o) => ({ id: o.id, label: o.label })),
  );

  const endLocal = new Date(poll.ends_at);
  const endInput = new Date(endLocal.getTime() - endLocal.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  function optionVotes(optionId: string) {
    if (!optionId) return 0;
    return voteCountByOptionId[optionId] ?? 0;
  }

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
        {!ended ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onEndEarly()}
            className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium text-amber-900"
          >
            Vorzeitig beenden
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing((v) => !v)}
          title={editing ? "Abbrechen" : "Bearbeiten"}
          aria-label={editing ? "Abbrechen" : "Bearbeiten"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDelete()}
          title="Löschen"
          aria-label="Löschen"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-800 shadow-sm transition hover:bg-rose-100"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
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
          <label className="flex flex-col gap-1 text-xs">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowMultiple}
                disabled={allowMultipleLocked}
                onChange={(e) => {
                  if (allowMultipleLocked) return;
                  setAllowMultiple(e.target.checked);
                }}
              />
              Mehrfachauswahl
            </span>
            {allowMultipleLocked ? (
              <span className="text-slate-500">
                Bereits aktiv — kann nicht mehr abgeschaltet werden (Stimmen bleiben gültig).
              </span>
            ) : (
              <span className="text-slate-500">
                Nachträglich nur aktivieren möglich, nicht wieder deaktivieren.
              </span>
            )}
          </label>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-600">Antwortmöglichkeiten</span>
            <p className="text-xs text-slate-500">
              Schreibfehler im Text darfst du jederzeit korrigieren. Optionen mit Stimmen können
              nicht gelöscht werden — nur der Text ist editierbar.
            </p>
            {options.map((o, i) => {
              const votes = optionVotes(o.id);
              const canRemove = !o.id || votes === 0;
              return (
                <div key={o.id || `new-${i}`} className="flex gap-1">
                  <input
                    value={o.label}
                    onChange={(e) =>
                      setOptions((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                      )
                    }
                    required
                    className="h-9 min-w-0 flex-1 rounded-lg border px-2 text-sm"
                    aria-describedby={votes > 0 ? `poll-opt-votes-${i}` : undefined}
                  />
                  {votes > 0 ? (
                    <span
                      id={`poll-opt-votes-${i}`}
                      className="flex shrink-0 items-center rounded-lg bg-slate-100 px-2 text-[10px] font-medium tabular-nums text-slate-600"
                      title="Stimmen für diese Option"
                    >
                      {votes} Stimmen
                    </span>
                  ) : null}
                  {options.length > 2 && canRemove ? (
                    <button
                      type="button"
                      title="Option entfernen"
                      onClick={() => setOptions((arr) => arr.filter((_, j) => j !== i))}
                      className="rounded-lg border px-2 text-slate-500 hover:bg-slate-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              );
            })}
            {options.length < 10 ? (
              <button
                type="button"
                className="text-xs font-medium text-fc-blue"
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
            className="h-9 rounded-lg bg-fc-navy text-xs font-semibold text-white"
          >
            Speichern
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
