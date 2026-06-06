"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";
import { removeMeetingParticipant } from "@/app/(app)/admin/treffen/actions";
import { Badge } from "@/components/ui/badge";
import { formatEur } from "@/lib/club/ledger";
import type { MeetingParticipantRow } from "@/lib/meetings/types";
import { cn } from "@/lib/cn";

function formatDue(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isOverdue(dueAt: string | null, status: string) {
  if (status !== "open" || !dueAt) return false;
  return new Date(dueAt).getTime() < Date.now();
}

export function MeetingAdminParticipants({
  meetingId,
  participants,
  paymentDeadlineDays,
}: {
  meetingId: string;
  participants: MeetingParticipantRow[];
  paymentDeadlineDays: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <p className="text-xs text-[color:var(--muted)]">
        Zahlungsfrist für dieses Treffen: <strong>{paymentDeadlineDays} Tage</strong> nach
        Anmeldung. Überfällige offene Beträge sind rot markiert — Entfernen hebt die Anmeldung und
        den offenen Posten auf.
      </p>
      {participants.length ? (
        participants.map((p) => {
          const overdue = isOverdue(p.paymentDueAt, p.chargeStatus);
          return (
            <div
              key={p.userId}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm",
                overdue && "border-rose-200 bg-rose-50/60",
              )}
            >
              <div className="min-w-0">
                <p className="font-medium text-fc-navy">{p.name}</p>
                <p className="text-xs text-[color:var(--muted)]">
                  Angemeldet{" "}
                  {new Date(p.joinedAt).toLocaleString("de-DE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                  {p.membershipNumber ? ` · Nr. ${p.membershipNumber}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {p.chargeStatus === "open" && p.chargeCents ? (
                    <Badge variant="warning">{formatEur(p.chargeCents)} offen</Badge>
                  ) : null}
                  {p.chargeStatus === "paid" ? <Badge variant="success">Bezahlt</Badge> : null}
                  {p.chargeStatus === "none" ? <Badge variant="neutral">Kostenfrei</Badge> : null}
                  {p.paymentDueAt && p.chargeStatus === "open" ? (
                    <Badge variant={overdue ? "danger" : "neutral"}>
                      {overdue ? "Überfällig seit" : "Zahlung bis"} {formatDue(p.paymentDueAt)}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                disabled={pending}
                title="Teilnahme entfernen"
                aria-label={`${p.name} vom Treffen entfernen`}
                onClick={() => {
                  if (
                    !window.confirm(
                      `${p.name} vom Treffen entfernen?${p.chargeStatus === "paid" ? " (bereits bezahlt — ggf. Rückerstattung separat klären)" : ""}`,
                    )
                  ) {
                    return;
                  }
                  setError(null);
                  startTransition(async () => {
                    try {
                      await removeMeetingParticipant(meetingId, p.userId);
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Fehler");
                    }
                  });
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-60"
              >
                <UserMinus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-[color:var(--muted)]">Noch keine Teilnehmer.</p>
      )}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
