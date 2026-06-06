"use client";

import { useState } from "react";
import { Pause, Pencil, Play, Plus, Square, Trash2 } from "lucide-react";
import {
  endGiveawayEarly,
  pauseGiveaway,
  resumeGiveaway,
  updateGiveawayFull,
} from "@/app/(app)/giveaways/actions";

type QuizQ = {
  id?: string;
  text: string;
  options: [string, string, string];
  correctIndex: number;
};

export function GiveawayAdminControls({
  giveaway,
  prizes: initialPrizes,
  questions: initialQuestions,
  hasEntries = false,
  hideToolbar = false,
  editing: controlledEditing,
  onEditingChange,
}: {
  giveaway: {
    id: string;
    title: string;
    description: string | null;
    ends_at: string;
    status: string;
    is_paused: boolean;
    is_year_end_lottery?: boolean;
    entry_mode: "simple" | "quiz";
  };
  prizes: { id: string; name: string }[];
  questions: Array<{
    id: string;
    text: string;
    options: { id: string; label: string; is_correct?: boolean }[];
  }>;
  /** Sobald Teilnehmer eingetragen sind: nur Texte/Preise, keine „richtige“ Antwort ändern. */
  hasEntries?: boolean;
  hideToolbar?: boolean;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  const [internalEditing, setInternalEditing] = useState(false);
  const editing = controlledEditing ?? internalEditing;
  const setEditing = (next: boolean | ((v: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(editing) : next;
    if (onEditingChange) onEditingChange(value);
    else setInternalEditing(value);
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawn = giveaway.status === "drawn";

  const [prizes, setPrizes] = useState(
    initialPrizes.length ? initialPrizes.map((p) => p.name) : [""],
  );
  const [questions, setQuestions] = useState<QuizQ[]>(() =>
    initialQuestions.length
      ? initialQuestions.map((q) => ({
          id: q.id,
          text: q.text,
          options: [
            q.options[0]?.label ?? "",
            q.options[1]?.label ?? "",
            q.options[2]?.label ?? "",
          ] as [string, string, string],
          correctIndex: Math.max(0, q.options.findIndex((o) => o.is_correct)),
        }))
      : [
          { text: "", options: ["", "", ""], correctIndex: 0 },
          { text: "", options: ["", "", ""], correctIndex: 0 },
          { text: "", options: ["", "", ""], correctIndex: 0 },
        ],
  );

  const endLocal = new Date(giveaway.ends_at);
  const endInput = new Date(endLocal.getTime() - endLocal.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  async function onEndEarly() {
    if (
      !window.confirm(
        "Gewinnspiel jetzt beenden? Teilnahme ist danach nicht mehr möglich.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await endGiveawayEarly(giveaway.id);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  async function togglePause() {
    setBusy(true);
    setError(null);
    try {
      if (giveaway.is_paused) await resumeGiveaway(giveaway.id);
      else await pauseGiveaway(giveaway.id);
      window.location.reload();
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
    prizes.filter(Boolean).forEach((p) => fd.append("prizes", p.trim()));
    if (giveaway.entry_mode === "quiz") {
      fd.set("questions_json", JSON.stringify(questions));
    }
    try {
      await updateGiveawayFull(fd);
      setEditing(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      setBusy(false);
    }
  }

  return (
    <div
      className={
        editing || !hideToolbar
          ? "rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm"
          : undefined
      }
    >
      {!hideToolbar ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {!drawn ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void togglePause()}
              title={giveaway.is_paused ? "Fortsetzen" : "Pausieren"}
              aria-label={giveaway.is_paused ? "Fortsetzen" : "Pausieren"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {giveaway.is_paused ? (
                <Play className="h-4 w-4" aria-hidden />
              ) : (
                <Pause className="h-4 w-4" aria-hidden />
              )}
            </button>
          ) : null}
          {!drawn && !giveaway.is_year_end_lottery ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onEndEarly()}
              title="Vorzeitig beenden"
              aria-label="Vorzeitig beenden"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-slate-700 shadow-sm transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
            >
              <Square className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          {!drawn ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(!editing)}
              title={editing ? "Abbrechen" : "Bearbeiten"}
              aria-label={editing ? "Abbrechen" : "Bearbeiten"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <form onSubmit={(e) => void onSave(e)} className="mt-3 grid gap-3">
          <p className="rounded-lg border border-blue-100 bg-fc-ice/80 px-2.5 py-2 text-xs text-blue-950">
            Hier bearbeitest du nur den <strong>Inhalt des Gewinnspiels</strong> (Titel, Texte,
            Preise, Quiz-Fragen). Deine persönliche Teilnahme oder Quiz-Antworten änderst du hier
            nicht — die bleiben unter „Deine Antworten“ gespeichert.
          </p>
          <input type="hidden" name="giveaway_id" value={giveaway.id} />
          <input type="hidden" name="entry_mode" value={giveaway.entry_mode} />
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-600">Titel</span>
            <input
              name="title"
              defaultValue={giveaway.title}
              required
              className="h-9 rounded-lg border px-2 text-sm"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-600">Beschreibung</span>
            <textarea
              name="description"
              defaultValue={giveaway.description ?? ""}
              rows={2}
              className="rounded-lg border px-2 py-1 text-sm"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-600">Ende</span>
            <input
              name="ends_at"
              type="datetime-local"
              defaultValue={endInput}
              required
              className="h-9 rounded-lg border px-2 text-sm"
            />
          </label>
          <div>
            <span className="text-xs font-medium text-slate-600">Preise</span>
            <div className="mt-1 space-y-1.5">
              {prizes.map((p, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    value={p}
                    onChange={(e) =>
                      setPrizes((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))
                    }
                    className="h-9 min-w-0 flex-1 rounded-lg border px-2 text-sm"
                    placeholder={`Preis ${i + 1}`}
                  />
                  {prizes.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setPrizes((arr) => arr.filter((_, j) => j !== i))}
                      className="rounded-lg border px-2 text-slate-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPrizes((arr) => [...arr, ""])}
                className="inline-flex items-center gap-1 text-xs font-medium text-fc-blue"
              >
                <Plus className="h-3 w-3" /> Preis
              </button>
            </div>
          </div>
          {giveaway.entry_mode === "quiz" ? (
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-600">Quiz-Fragen (Gewinnspiel-Inhalt)</span>
              {hasEntries ? (
                <p className="text-xs text-slate-500">
                  Es gibt bereits Teilnahmen: Frage- und Antworttexte dürfen korrigiert werden, die
                  festgelegte richtige Antwort pro Frage kann nicht mehr geändert werden.
                </p>
              ) : null}
              {questions.map((q, qi) => (
                <div key={qi} className="rounded-lg border bg-white p-2">
                  <input
                    value={q.text}
                    onChange={(e) =>
                      setQuestions((arr) =>
                        arr.map((x, j) => (j === qi ? { ...x, text: e.target.value } : x)),
                      )
                    }
                    placeholder={`Frage ${qi + 1}`}
                    className="mb-2 h-9 w-full rounded-lg border px-2 text-sm"
                  />
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="mt-1 flex items-center gap-2 text-xs">
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        checked={q.correctIndex === oi}
                        disabled={hasEntries}
                        onChange={() =>
                          setQuestions((arr) =>
                            arr.map((x, j) => (j === qi ? { ...x, correctIndex: oi } : x)),
                          )
                        }
                        title={
                          hasEntries
                            ? "Richtige Antwort kann nach Teilnahmen nicht geändert werden"
                            : undefined
                        }
                      />
                      <input
                        value={opt}
                        onChange={(e) =>
                          setQuestions((arr) =>
                            arr.map((x, j) =>
                              j === qi
                                ? {
                                    ...x,
                                    options: x.options.map((o, k) =>
                                      k === oi ? e.target.value : o,
                                    ) as [string, string, string],
                                  }
                                : x,
                            ),
                          )
                        }
                        className="h-8 min-w-0 flex-1 rounded-lg border px-2 text-sm"
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="h-9 rounded-lg bg-fc-navy text-xs font-semibold text-white"
          >
            Alles speichern
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
