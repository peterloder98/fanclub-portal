"use client";

import { useState } from "react";

type Props = {
  value: string;
};

/** E-Mail = Login. Nur nach bewusstem Freischalten änderbar. */
export function MemberEmailEditField({ value }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [current, setCurrent] = useState(value);

  function unlock() {
    const ok = window.confirm(
      "E-Mail wirklich bearbeiten?\n\n" +
        "Die E-Mail ist zugleich die Login-Adresse.\n" +
        "Nach dem Speichern kann sich das Mitglied nur noch mit der neuen Adresse anmelden " +
        "(Passwort bleibt gleich). App-Zugang-Mails gehen danach an die neue Adresse.\n\n" +
        "Bitte nur ändern, wenn die Adresse fehlt oder korrigiert werden muss — " +
        "und das Mitglied vorher informieren, sobald Zugänge schon existieren.",
    );
    if (!ok) return;
    setUnlocked(true);
  }

  return (
    <div className="grid gap-1 md:col-span-2">
      <span className="text-sm font-medium text-slate-700">E-Mail (Login)</span>
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          value={current}
          readOnly={!unlocked}
          onChange={(e) => setCurrent(e.target.value)}
          className={`h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm outline-none ${
            unlocked ? "border-amber-300 bg-amber-50" : "bg-slate-50 text-slate-700"
          }`}
          placeholder="fuer.login@example.de"
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
          Achtung: Nach dem Speichern ändert sich der Login. Mitglied ggf. informieren.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Muss eindeutig sein. Ändern nur bewusst — die Adresse ist zugleich der Login.
        </p>
      )}
    </div>
  );
}
