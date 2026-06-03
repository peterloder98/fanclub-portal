"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createGiveaway } from "@/app/(app)/giveaways/actions";

type QuizQ = {
  text: string;
  options: [string, string, string];
  correctIndex: number;
};

export function GiveawayAdminCreate() {
  const [entryMode, setEntryMode] = useState<"simple" | "quiz">("simple");
  const [prizes, setPrizes] = useState(["", ""]);
  const [questions, setQuestions] = useState<QuizQ[]>([
    { text: "", options: ["", "", ""], correctIndex: 0 },
    { text: "", options: ["", "", ""], correctIndex: 0 },
    { text: "", options: ["", "", ""], correctIndex: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function addPrize() {
    setPrizes((p) => [...p, ""]);
  }

  function addQuestion() {
    setQuestions((q) => [...q, { text: "", options: ["", "", ""], correctIndex: 0 }]);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("entry_mode", entryMode);
    prizes.filter(Boolean).forEach((p) => fd.append("prizes", p.trim()));
    if (entryMode === "quiz") {
      fd.set("questions_json", JSON.stringify(questions));
    }
    try {
      await createGiveaway(fd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      setBusy(false);
    }
  }

  const defaultEnd = new Date(Date.now() + 14 * 86400000);
  const endLocal = new Date(defaultEnd.getTime() - defaultEnd.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Neues Gewinnspiel anlegen</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Titel</span>
            <input
              name="title"
              required
              className="h-10 rounded-xl border px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
              placeholder="z. B. Konzerttickets Juni 2026"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Beschreibung</span>
            <textarea
              name="description"
              rows={3}
              className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
              placeholder="Regeln, Hinweise …"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Ende (Datum & Uhrzeit)</span>
            <input
              name="ends_at"
              type="datetime-local"
              required
              defaultValue={endLocal}
              className="h-10 rounded-xl border px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
          </label>

          <div className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Teilnahme-Modus</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEntryMode("simple")}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                  entryMode === "simple" ? "border-slate-900 bg-slate-900 text-white" : ""
                }`}
              >
                Einfach teilnehmen
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("quiz")}
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                  entryMode === "quiz" ? "border-slate-900 bg-slate-900 text-white" : ""
                }`}
              >
                Quiz (mind. 3 Fragen)
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Preise</span>
              <button
                type="button"
                onClick={addPrize}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600"
              >
                <Plus className="h-3.5 w-3.5" /> Preis
              </button>
            </div>
            {prizes.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={p}
                  onChange={(e) =>
                    setPrizes((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))
                  }
                  required={i === 0}
                  className="h-10 flex-1 rounded-xl border px-3 text-sm"
                  placeholder={`Preis ${i + 1}`}
                />
                {prizes.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setPrizes((arr) => arr.filter((_, j) => j !== i))}
                    className="grid h-10 w-10 place-items-center rounded-xl border text-rose-600"
                    aria-label="Preis entfernen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {entryMode === "quiz" ? (
            <div className="grid gap-3 rounded-xl border bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Quiz-Fragen</span>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600"
                >
                  <Plus className="h-3.5 w-3.5" /> Frage
                </button>
              </div>
              {questions.map((q, qi) => (
                <div key={qi} className="rounded-lg border bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Frage {qi + 1}</span>
                    {questions.length > 3 ? (
                      <button
                        type="button"
                        onClick={() => setQuestions((arr) => arr.filter((_, j) => j !== qi))}
                        className="text-xs text-rose-600"
                      >
                        Entfernen
                      </button>
                    ) : null}
                  </div>
                  <input
                    value={q.text}
                    onChange={(e) =>
                      setQuestions((arr) =>
                        arr.map((item, j) =>
                          j === qi ? { ...item, text: e.target.value } : item,
                        ),
                      )
                    }
                    required
                    className="mb-2 h-9 w-full rounded-lg border px-2 text-sm"
                    placeholder="Fragentext"
                  />
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="mt-1 flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        checked={q.correctIndex === oi}
                        onChange={() =>
                          setQuestions((arr) =>
                            arr.map((item, j) =>
                              j === qi ? { ...item, correctIndex: oi } : item,
                            ),
                          )
                        }
                      />
                      <input
                        value={opt}
                        onChange={(e) =>
                          setQuestions((arr) =>
                            arr.map((item, j) => {
                              if (j !== qi) return item;
                              const opts = [...item.options] as [string, string, string];
                              opts[oi] = e.target.value;
                              return { ...item, options: opts };
                            }),
                          )
                        }
                        required
                        className="h-8 flex-1 rounded-lg border px-2 text-sm"
                        placeholder={`Antwort ${oi + 1}`}
                      />
                    </label>
                  ))}
                  <p className="mt-1 text-[10px] text-slate-500">
                    Radio = richtige Antwort für diese Frage
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Speichern…" : "Gewinnspiel veröffentlichen"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
