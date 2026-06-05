"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { resendEmailLogEntryAction } from "@/app/(app)/admin/settings/email-log/actions";
import type { EmailLogRow } from "@/lib/email/send-log";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

function statusLabel(status: EmailLogRow["status"]) {
  if (status === "sent") return "Gesendet";
  if (status === "failed") return "Fehlgeschlagen";
  return "Übersprungen";
}

export function EmailSendLogPanel({
  rows,
  available,
}: {
  rows: EmailLogRow[];
  available: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!available) {
    return (
      <Card>
        <CardContent className="pt-5 text-sm text-amber-800">
          E-Mail-Historie noch nicht eingerichtet. Bitte{" "}
          <code className="rounded bg-amber-100 px-1">supabase/061_email_send_log.sql</code> ausführen.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>E-Mail-Versandhistorie</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        {rows.length === 0 ? (
          <EmptyState>Noch keine protokollierten E-Mails.</EmptyState>
        ) : (
          <div className="grid gap-2">
            {rows.map((r) => {
              const expanded = expandedId === r.id;
              const canResend = r.status === "failed" || r.status === "skipped";
              return (
                <div key={r.id} className="rounded-xl border bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900">{r.subject}</div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        An {r.to_address} · {formatWhen(r.created_at)}
                      </div>
                    </div>
                    <span
                      className={
                        r.status === "sent"
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                          : r.status === "failed"
                            ? "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800"
                            : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                      }
                    >
                      {statusLabel(r.status)}
                    </span>
                  </div>
                  {r.error_message ? (
                    <p className="mt-2 text-xs text-rose-700">{r.error_message}</p>
                  ) : null}
                  {r.skip_reason ? (
                    <p className="mt-2 text-xs text-slate-600">Grund: {r.skip_reason}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : r.id)}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      {expanded ? "Weniger" : "Inhalt anzeigen"}
                    </button>
                    {canResend ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setError(null);
                          startTransition(async () => {
                            try {
                              const result = await resendEmailLogEntryAction(r.id);
                              if (!result.ok) {
                                const msg =
                                  "error" in result && result.error
                                    ? result.error
                                    : "Versand erneut fehlgeschlagen";
                                setError(msg);
                              }
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Fehler");
                            }
                          });
                        }}
                        className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50"
                      >
                        Erneut senden
                      </button>
                    ) : null}
                  </div>
                  {expanded ? (
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                      {r.body_text}
                    </pre>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
