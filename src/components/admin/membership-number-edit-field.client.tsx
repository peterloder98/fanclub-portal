"use client";

import { useState } from "react";

type Props = {
  value: string;
};

export function MembershipNumberEditField({ value }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [current, setCurrent] = useState(value);

  function unlock() {
    const ok = window.confirm(
      "Mitgliedsnummer wirklich bearbeiten?\n\nBitte nur ändern, wenn die Nummer korrigiert werden muss.",
    );
    if (!ok) return;
    setUnlocked(true);
  }

  return (
    <div className="grid gap-1">
      <span className="text-sm font-medium text-slate-700">Mitgliedsnummer</span>
      <div className="flex gap-2">
        <input
          name="membership_number"
          value={current}
          readOnly={!unlocked}
          onChange={(e) => setCurrent(e.target.value)}
          className={`h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm outline-none ${
            unlocked ? "border-amber-300 bg-amber-50" : "bg-slate-50 text-slate-700"
          }`}
          placeholder="—"
          inputMode="numeric"
          autoComplete="off"
        />
        {!unlocked ? (
          <button
            type="button"
            onClick={unlock}
            className="h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Ändern
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCurrent(value);
              setUnlocked(false);
            }}
            className="h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Abbrechen
          </button>
        )}
      </div>
      {unlocked ? (
        <p className="text-xs text-amber-800">
          Bearbeitung freigegeben. Die Nummer muss eindeutig sein.
        </p>
      ) : null}
    </div>
  );
}
