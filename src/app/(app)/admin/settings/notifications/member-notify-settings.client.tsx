"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateMemberNotifySettingsAction,
} from "@/app/(app)/admin/settings/notifications/actions";

export function MemberNotifySettingsClient({
  initialGiveaway,
  initialPoll,
}: {
  initialGiveaway: boolean;
  initialPoll: boolean;
}) {
  const [notifyGiveaway, setNotifyGiveaway] = useState(initialGiveaway);
  const [notifyPoll, setNotifyPoll] = useState(initialPoll);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateMemberNotifySettingsAction({
          notifyNewGiveaway: notifyGiveaway,
          notifyNewPoll: notifyPoll,
        });
        setMessage("Einstellungen gespeichert.");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Mitglieder-Benachrichtigungen</CardTitle>
          <p className="text-sm text-slate-600">
            Optional E-Mail an alle <strong>aktiven Mitglieder</strong> (nicht Antragsteller), wenn du
            ein neues Gewinnspiel oder eine neue Umfrage anlegst. Standard: aus.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={notifyGiveaway}
              onChange={(e) => setNotifyGiveaway(e.target.checked)}
            />
            <span>
              <span className="font-medium text-fc-navy">Neues Gewinnspiel</span>
              <span className="mt-0.5 block text-sm text-slate-600">
                Betreff: „Neues Gewinnspiel in der Anni Perka Fanclub App“ — Fanclub-Signatur fest.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={notifyPoll}
              onChange={(e) => setNotifyPoll(e.target.checked)}
            />
            <span>
              <span className="font-medium text-fc-navy">Neue Umfrage</span>
              <span className="mt-0.5 block text-sm text-slate-600">
                Betreff: „Neue Umfrage in der Anni Perka Fanclub App“ — gleiche Vorlage, angepasster Text.
              </span>
            </span>
          </label>

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
            <strong>Versand:</strong> E-Mails gehen in kleinen Paketen (5 Adressen, kurze Pause dazwischen),
            damit der SMTP-Anbieter nicht blockiert. Einzelne Fehler stoppen den Rest nicht. Max. 500
            Empfänger pro Durchlauf.
          </div>

          {message ? (
            <p className="text-sm text-slate-700" role="status">
              {message}
            </p>
          ) : null}

          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="h-11 rounded-xl bg-fc-navy px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Speichern
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
