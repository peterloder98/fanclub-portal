"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  activityTypeLabel,
  type MemberActivityRow,
} from "@/lib/membership/activity-log";
import {
  addMemberActivityNote,
  fetchMemberActivity,
} from "@/app/(app)/admin/members/applications/actions";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function MemberActivityTimeline({
  userId,
  applicationId,
}: {
  userId?: string | null;
  applicationId?: string | null;
}) {
  const [rows, setRows] = useState<MemberActivityRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [noteType, setNoteType] = useState<"payment_received" | "warning_issued" | "note">(
    "payment_received",
  );
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDetails, setNoteDetails] = useState("");

  function reload() {
    startTransition(async () => {
      try {
        setError(null);
        const data = await fetchMemberActivity({ userId, applicationId });
        setRows(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Historie konnte nicht geladen werden");
        setRows([]);
      }
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, applicationId]);

  function addNote() {
    if (!noteTitle.trim()) return;
    startTransition(async () => {
      try {
        await addMemberActivityNote({
          userId,
          applicationId,
          eventType: noteType,
          title: noteTitle.trim(),
          details: noteDetails.trim() || undefined,
        });
        setNoteTitle("");
        setNoteDetails("");
        setShowAddForm(false);
        reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Eintrag fehlgeschlagen");
      }
    });
  }

  return (
    <div className="rounded-xl border bg-slate-50/80 p-4">
      <h4 className="text-sm font-semibold text-slate-900">Historie</h4>
      <p className="mt-0.5 text-xs text-slate-600">
        Aufnahme, E-Mails, Zahlungen, Verwarnungen und Änderungen.
      </p>

      {error ? (
        <p className="mt-2 text-xs text-rose-700">{error}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Noch keine Einträge.</p>
      ) : (
        <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
          {rows.map((r) => {
            const ledgerId =
              typeof r.metadata?.ledger_entry_id === "string" ? r.metadata.ledger_entry_id : null;
            return (
            <li
              key={r.id}
              id={`activity-${r.id}`}
              className={
                r.event_type === "warning_issued"
                  ? "rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs"
                  : "rounded-lg border bg-white px-3 py-2 text-xs"
              }
            >
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <span className="font-semibold text-slate-900">{r.title}</span>
                <span className="text-slate-500">{formatWhen(r.created_at)}</span>
              </div>
              <div className="mt-0.5 text-slate-500">
                {activityTypeLabel(r.event_type)}
                {r.created_by_name ? ` · ${r.created_by_name}` : ""}
              </div>
              {r.details ? (
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{r.details}</p>
              ) : null}
              {r.link_url ? (
                <a
                  href={r.link_url}
                  className="mt-1 inline-block font-medium text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {r.link_label ?? "Ansehen"} →
                </a>
              ) : null}
              {ledgerId ? (
                <Link
                  href={`#ledger-${ledgerId}`}
                  className="mt-1 inline-block font-medium text-blue-600 hover:underline"
                >
                  Buchung ansehen →
                </Link>
              ) : null}
            </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 border-t pt-3">
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="h-9 rounded-lg border bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Neuen Eintrag anlegen
          </button>
        ) : (
          <div className="grid gap-2">
            <p className="text-xs font-semibold text-slate-700">Neuer Historie-Eintrag</p>
            <select
              value={noteType}
              onChange={(e) =>
                setNoteType(e.target.value as "payment_received" | "warning_issued" | "note")
              }
              className="h-9 rounded-lg border px-2 text-xs"
            >
              <option value="payment_received">Beitrag eingegangen</option>
              <option value="warning_issued">Verwarnung</option>
              <option value="note">Sonstige Notiz</option>
            </select>
            <input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Kurztitel, z. B. Beitrag 2026 eingegangen"
              className="h-9 rounded-lg border px-2 text-xs"
            />
            <textarea
              value={noteDetails}
              onChange={(e) => setNoteDetails(e.target.value)}
              placeholder="Details (optional)"
              rows={2}
              className="rounded-lg border px-2 py-1 text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending || !noteTitle.trim()}
                onClick={addNote}
                className="h-9 rounded-lg bg-slate-800 px-3 text-xs font-semibold text-white disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setShowAddForm(false);
                  setNoteTitle("");
                  setNoteDetails("");
                }}
                className="h-9 rounded-lg border px-3 text-xs font-semibold text-slate-600"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
