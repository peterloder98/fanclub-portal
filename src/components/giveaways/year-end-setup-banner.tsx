"use client";

import { useState } from "react";
import { setupYearEndGiveaway } from "@/app/(app)/giveaways/actions";

export function YearEndSetupBanner({
  pointsYear,
  existingGiveawayId,
}: {
  pointsYear: number;
  existingGiveawayId: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existingGiveawayId) {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm text-violet-950">
        Jahresverlosung für <strong>{pointsYear}</strong> ist angelegt.{" "}
        <a href={`/giveaways/${existingGiveawayId}`} className="font-semibold text-violet-800 underline">
          Preise eintragen & bestätigen →
        </a>
      </div>
    );
  }

  async function onSetup() {
    if (
      !window.confirm(
        `Sonderverlosung für Statuspunkte ${pointsYear} anlegen? Die Top-10 werden automatisch eingetragen.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await setupYearEndGiveaway(pointsYear);
      window.location.href = `/giveaways/${result.giveawayId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm">
      <p className="text-violet-950">
        <strong>Jahresend {pointsYear}:</strong> Noch keine Sonderverlosung für die Top-10 nach
        Statuspunkten.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onSetup()}
        className="mt-2 rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        Jahresverlosung anlegen
      </button>
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
