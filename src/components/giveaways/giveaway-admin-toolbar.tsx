"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Pencil, Play, Square, Trash2 } from "lucide-react";
import {
  deleteGiveaway,
  endGiveawayEarly,
  pauseGiveaway,
  resumeGiveaway,
} from "@/app/(app)/giveaways/actions";

export function GiveawayAdminToolbar({
  giveawayId,
  isPaused,
  status,
  isYearEndLottery = false,
  editHref,
  onEdit,
  className,
}: {
  giveawayId: string;
  isPaused: boolean;
  status: string;
  isYearEndLottery?: boolean;
  editHref?: string;
  onEdit?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawn = status === "drawn";
  const ended = status === "ended";
  const canDelete = !isYearEndLottery && (ended || drawn);
  const showLifecycle = !drawn && !ended;

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
      await endGiveawayEarly(giveawayId);
      router.refresh();
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  async function onDelete() {
    if (
      !window.confirm(
        "Gewinnspiel endgültig löschen? Alle Teilnahmen und Preise werden entfernt — das kann nicht rückgängig gemacht werden.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteGiveaway(giveawayId);
      router.push("/giveaways?tab=ended");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  async function togglePause() {
    setBusy(true);
    setError(null);
    try {
      if (isPaused) await resumeGiveaway(giveawayId);
      else await pauseGiveaway(giveawayId);
      router.refresh();
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  if (isYearEndLottery && !canDelete) return null;

  return (
    <div
      className={className}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {showLifecycle ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void togglePause()}
              title={isPaused ? "Fortsetzen" : "Pausieren"}
              aria-label={isPaused ? "Fortsetzen" : "Pausieren"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {isPaused ? (
                <Play className="h-4 w-4" aria-hidden />
              ) : (
                <Pause className="h-4 w-4" aria-hidden />
              )}
            </button>
            {!isYearEndLottery ? (
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
          </>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDelete()}
            title="Gewinnspiel löschen"
            aria-label="Gewinnspiel löschen"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        {editHref && showLifecycle ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => router.push(editHref)}
            title="Bearbeiten"
            aria-label="Bearbeiten"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        ) : onEdit && showLifecycle ? (
          <button
            type="button"
            disabled={busy}
            onClick={onEdit}
            title="Bearbeiten"
            aria-label="Bearbeiten"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
