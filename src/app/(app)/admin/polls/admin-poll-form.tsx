"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { createPoll } from "@/app/(app)/admin/polls/actions";

export function AdminPollForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [optionCount, setOptionCount] = useState(3);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const defaultEnds = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (allowMultiple) fd.set("allow_multiple", "on");
    else fd.delete("allow_multiple");
    startTransition(async () => {
      try {
        await createPoll(fd);
        router.push("/polls?refresh=1");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      }
    });
  }

  return (
    <div className="mb-4 max-w-2xl">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
        }}
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
            {error ? (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </div>
            ) : null}
            <form onSubmit={onSubmit} className="grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Frage</span>
                <input
                  name="question"
                  required
                  disabled={pending}
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)] disabled:opacity-60"
                  placeholder="z. B. Welches Merch wünscht ihr euch?"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700">Ende</span>
                <input
                  type="datetime-local"
                  name="ends_at"
                  required
                  disabled={pending}
                  defaultValue={defaultEnds()}
                  className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)] disabled:opacity-60"
                />
              </label>

              <label className="flex flex-col gap-1 rounded-xl border bg-slate-50 px-3 py-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowMultiple}
                    disabled={pending}
                    onChange={(e) => setAllowMultiple(e.target.checked)}
                  />
                  Mehrfachauswahl möglich
                </span>
                <span className="text-xs text-slate-500">
                  Standard ist Einfachauswahl (genau eine Antwort). Haken setzen, wenn Mitglieder
                  mehrere Optionen wählen dürfen.
                </span>
              </label>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Antwortoptionen (3–10)
                  </span>
                  <button
                    type="button"
                    disabled={optionCount >= 10 || pending}
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
                    disabled={pending}
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)] disabled:opacity-60"
                    placeholder={`Option ${i + 1}`}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={pending}
                className="h-11 rounded-xl bg-fc-navy text-sm font-semibold text-white shadow-sm shadow-slate-900/10 hover:bg-fc-blue disabled:opacity-60"
              >
                {pending ? "Wird veröffentlicht…" : "Umfrage veröffentlichen"}
              </button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
