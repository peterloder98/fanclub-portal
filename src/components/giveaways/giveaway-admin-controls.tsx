"use client";

import { useState } from "react";
import {
  pauseGiveaway,
  resumeGiveaway,
  updateGiveawayBasics,
} from "@/app/(app)/giveaways/actions";

export function GiveawayAdminControls({
  giveaway,
}: {
  giveaway: {
    id: string;
    title: string;
    description: string | null;
    ends_at: string;
    status: string;
    is_paused: boolean;
  };
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawn = giveaway.status === "drawn";

  const endLocal = new Date(giveaway.ends_at);
  const endInput = new Date(endLocal.getTime() - endLocal.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

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
    try {
      await updateGiveawayBasics(new FormData(e.currentTarget));
      setEditing(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm">
      <div className="font-semibold text-amber-950">Admin</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {!drawn ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void togglePause()}
            className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium"
          >
            {giveaway.is_paused ? "Fortsetzen" : "Pausieren"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg border bg-white px-3 py-1.5 text-xs font-medium"
        >
          {editing ? "Abbrechen" : "Bearbeiten"}
        </button>
      </div>

      {editing ? (
        <form onSubmit={(e) => void onSave(e)} className="mt-3 grid gap-2">
          <input type="hidden" name="giveaway_id" value={giveaway.id} />
          <input
            name="title"
            defaultValue={giveaway.title}
            required
            className="h-9 rounded-lg border px-2 text-sm"
          />
          <textarea
            name="description"
            defaultValue={giveaway.description ?? ""}
            rows={2}
            className="rounded-lg border px-2 py-1 text-sm"
          />
          {!drawn ? (
            <input
              name="ends_at"
              type="datetime-local"
              defaultValue={endInput}
              required
              className="h-9 rounded-lg border px-2 text-sm"
            />
          ) : null}
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
