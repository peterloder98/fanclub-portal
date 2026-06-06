"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { createPoll } from "@/app/(app)/admin/polls/actions";

export function AdminPollForm() {
  const [open, setOpen] = useState(false);
  const [optionCount, setOptionCount] = useState(3);

  const defaultEnds = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div className="mb-4 max-w-2xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-fc-blue"
      >
        {open ? "Abbrechen" : "Neue Umfrage erstellen"}
      </button>

      {open ? (
        <Card className={cn("mt-3")}>
          <CardHeader>
            <CardTitle>Neue Umfrage</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createPoll} className="grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Frage</span>
                <input
                  name="question"
                  required
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                  placeholder="z. B. Welches Merch wünscht ihr euch?"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Ende</span>
                <input
                  type="datetime-local"
                  name="ends_at"
                  required
                  defaultValue={defaultEnds()}
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="allow_multiple" className="h-4 w-4 rounded border" />
                Mehrfachauswahl erlauben
              </label>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Antwortoptionen (3–10)
                  </span>
                  <button
                    type="button"
                    disabled={optionCount >= 10}
                    onClick={() => setOptionCount((c) => Math.min(10, c + 1))}
                    className="text-sm font-medium text-fc-blue disabled:opacity-50"
                  >
                    + Option
                  </button>
                </div>
                {Array.from({ length: optionCount }).map((_, i) => (
                  <input
                    key={i}
                    name="options"
                    required={i < 3}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                    placeholder={`Option ${i + 1}`}
                  />
                ))}
              </div>

              <button className="h-11 rounded-xl bg-fc-navy text-sm font-semibold text-white shadow-sm shadow-slate-900/10 hover:bg-fc-blue">
                Umfrage veröffentlichen
              </button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
