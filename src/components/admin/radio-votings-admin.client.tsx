"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RadioVotingCampaignRow } from "@/lib/votings/radio-campaign-types";
import {
  deleteRadioVotingCampaign,
  saveRadioVotingCampaign,
  startNewRadioVotingCycle,
  toggleRadioVotingCampaign,
} from "@/app/(app)/admin/radio-votings/actions";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): Partial<RadioVotingCampaignRow> & { stepsText: string } {
  return {
    station: "",
    region: "",
    chart_name: "",
    voting_url: "",
    ends_at: "",
    song_title: "",
    instructions: "",
    stepsText: "",
    sort_order: 0,
    is_active: true,
  };
}

export function RadioVotingsAdmin({ campaigns }: { campaigns: RadioVotingCampaignRow[] }) {
  const [edit, setEdit] = useState<(RadioVotingCampaignRow & { stepsText: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = edit ?? { ...emptyForm(), id: undefined };

  function loadForEdit(row: RadioVotingCampaignRow) {
    setEdit({
      ...row,
      stepsText: (row.steps ?? []).join("\n"),
    });
    setError(null);
  }

  function resetForm() {
    setEdit(null);
    setError(null);
  }

  function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await saveRadioVotingCampaign(fd);
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      }
    });
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{edit?.id ? "Voting bearbeiten" : "Neues Radio-Voting"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitForm} className="grid gap-3 lg:grid-cols-2">
            {edit?.id ? <input type="hidden" name="id" value={edit.id} /> : null}

            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Sender *</span>
              <input
                name="station"
                required
                defaultValue={form.station}
                className="h-11 rounded-xl border bg-white px-3 text-sm"
              />
            </label>
            <input type="hidden" name="region" value="" />
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Chart-Name *</span>
              <input
                name="chart_name"
                required
                defaultValue={form.chart_name}
                className="h-11 rounded-xl border bg-white px-3 text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Voting-URL *</span>
              <input
                name="voting_url"
                type="url"
                required
                defaultValue={form.voting_url}
                className="h-11 rounded-xl border bg-white px-3 text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Ende *</span>
              <input
                name="ends_at"
                type="datetime-local"
                required
                defaultValue={form.ends_at ? toDatetimeLocal(form.ends_at) : ""}
                className="h-11 rounded-xl border bg-white px-3 text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Song / Titel *</span>
              <input
                name="song_title"
                required
                defaultValue={form.song_title}
                className="h-11 rounded-xl border bg-white px-3 text-sm"
              />
            </label>
            <label className="grid gap-1 lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Kurzinfo *</span>
              <textarea
                name="instructions"
                required
                rows={2}
                defaultValue={form.instructions}
                className="rounded-xl border bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                Anleitung (eine Zeile pro Schritt) *
              </span>
              <textarea
                name="steps"
                required
                rows={5}
                defaultValue={form.stepsText ?? ""}
                className="rounded-xl border bg-white px-3 py-2 text-sm font-mono"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Sortierung</span>
              <input
                name="sort_order"
                type="number"
                defaultValue={form.sort_order ?? 0}
                className="h-11 rounded-xl border bg-white px-3 text-sm"
              />
            </label>
            <div className="flex flex-col gap-2 pt-6">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={form.is_active !== false}
                  className="h-4 w-4 rounded border"
                />
                Aktiv (für Mitglieder sichtbar)
              </label>
              {edit?.id ? (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="reset_cycle" className="h-4 w-4 rounded border" />
                  Neue Voting-Runde (Teilnahme aller Mitglieder zurücksetzen)
                </label>
              ) : null}
            </div>

            {error ? (
              <p className="lg:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 lg:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="h-11 rounded-xl bg-fc-navy px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Speichern…" : edit?.id ? "Aktualisieren" : "Anlegen"}
              </button>
              {edit?.id ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-11 rounded-xl border bg-white px-5 text-sm font-medium text-slate-700"
                >
                  Abbrechen
                </button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {campaigns.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-fc-navy">{c.station}</h3>
                  {c.is_active ? (
                    <Badge variant="success">Aktiv</Badge>
                  ) : (
                    <Badge variant="neutral">Inaktiv</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600">{c.song_title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Ende:{" "}
                  {new Date(c.ends_at).toLocaleString("de-DE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  · Runde: {c.cycle_key}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadForEdit(c)}
                  className="h-9 rounded-xl border bg-white px-3 text-sm font-medium text-slate-700"
                >
                  Bearbeiten
                </button>
                <form action={startNewRadioVotingCycle}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="h-9 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-900"
                  >
                    Neue Runde
                  </button>
                </form>
                <form action={toggleRadioVotingCampaign}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="is_active" value={String(!c.is_active)} />
                  <button
                    type="submit"
                    className="h-9 rounded-xl border px-3 text-sm font-medium text-slate-700"
                  >
                    {c.is_active ? "Deaktivieren" : "Aktivieren"}
                  </button>
                </form>
                <form
                  action={deleteRadioVotingCampaign}
                  onSubmit={(e) => {
                    if (!confirm("Voting wirklich löschen?")) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="h-9 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-800"
                  >
                    Löschen
                  </button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
