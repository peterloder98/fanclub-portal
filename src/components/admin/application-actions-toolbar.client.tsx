"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveMembershipApplicationWithNumber,
  deleteMembershipApplication,
  getPaymentReminderDraft,
  rejectMembershipApplication,
  sendPaymentReminderEmail,
} from "@/app/(app)/admin/members/applications/actions";
import { EmailDialogShell } from "@/components/ui/email-dialog-shell";
import { replaceTrailingSignature } from "@/lib/email/signature-body";
import type { MailSignatureOption } from "@/lib/email/signatures";

export type ApplicationActionsApp = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  user_id: string | null;
};

export function ApplicationActionsToolbar({ app }: { app: ApplicationActionsApp }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [paymentSubject, setPaymentSubject] = useState("");
  const [paymentBody, setPaymentBody] = useState("");
  const [paymentSignatures, setPaymentSignatures] = useState<MailSignatureOption[]>([]);
  const [paymentSignatureId, setPaymentSignatureId] = useState("");
  const [paymentSignatureTexts, setPaymentSignatureTexts] = useState<Record<string, string>>({});
  const [paymentActiveSignatureText, setPaymentActiveSignatureText] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const actionable =
    app.status !== "approved" && app.status !== "rejected";

  async function loadPaymentDraft(signatureId?: string) {
    setPaymentLoading(true);
    try {
      const draft = await getPaymentReminderDraft(app.id, signatureId);
      setPaymentSubject(draft.subject);
      setPaymentBody(draft.body);
      setPaymentSignatures(draft.signatures);
      setPaymentSignatureId(draft.defaultSignatureId);
      setPaymentSignatureTexts(draft.signatureTexts);
      setPaymentActiveSignatureText(draft.signatureTexts[draft.defaultSignatureId] ?? "");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorlage konnte nicht geladen werden");
      return false;
    } finally {
      setPaymentLoading(false);
    }
  }

  function onPaymentSignatureChange(signatureId: string) {
    const nextText = paymentSignatureTexts[signatureId] ?? "";
    setPaymentBody((body) =>
      replaceTrailingSignature(
        body,
        paymentActiveSignatureText,
        nextText,
        Object.values(paymentSignatureTexts),
      ),
    );
    setPaymentActiveSignatureText(nextText);
    setPaymentSignatureId(signatureId);
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {actionable ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                setShowApproveDialog(true);
              }}
              className="fc-btn-primary h-10 disabled:opacity-50"
            >
              Freigeben
            </button>
            <button
              type="button"
              disabled={pending || paymentLoading}
              onClick={() => {
                setError(null);
                void loadPaymentDraft().then((ok) => {
                  if (ok) setShowPaymentDialog(true);
                });
              }}
              className="fc-btn-secondary h-10 disabled:opacity-50"
            >
              Zahlungserinnerung
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setRejectReason("");
                setError(null);
                setShowRejectDialog(true);
              }}
              className="fc-action-warn inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold disabled:opacity-50"
            >
              Ablehnen
            </button>
          </>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const label = `${app.first_name} ${app.last_name}`;
            if (
              !window.confirm(
                `Antrag von „${label}" vollständig löschen?\n\nDatensatz, PDF und ggf. Test-Benutzerkonto werden unwiderruflich entfernt.`,
              )
            ) {
              return;
            }
            setError(null);
            startTransition(async () => {
              try {
                await deleteMembershipApplication(app.id);
                router.push("/admin/members");
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
              }
            });
          }}
          className="fc-action-delete inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold disabled:opacity-50"
        >
          Löschen
        </button>
      </div>

      {showApproveDialog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-fc-navy/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-fc-navy">Antrag freigeben</h3>
            <p className="mt-1 text-sm text-slate-600">
              {app.first_name} {app.last_name} — Status wird auf „aktiv“ gesetzt. Mitgliedsnummer
              und Vertrag-PDF werden automatisch ergänzt.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="h-10 rounded-xl border px-4 text-sm font-semibold"
                onClick={() => setShowApproveDialog(false)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={pending}
                className="fc-btn-primary h-10 disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await approveMembershipApplicationWithNumber(app.id);
                      setShowApproveDialog(false);
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Freigabe fehlgeschlagen");
                      setShowApproveDialog(false);
                    }
                  });
                }}
              >
                Freigeben
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRejectDialog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-fc-navy/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-fc-navy">Antrag ablehnen</h3>
            <p className="mt-1 text-sm text-slate-600">
              {app.first_name} {app.last_name} — Status wird auf „abgelehnt“ gesetzt.
            </p>
            <label className="mt-4 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Grund (optional, intern)</span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="h-10 rounded-xl border px-4 text-sm font-semibold"
                onClick={() => setShowRejectDialog(false)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={pending}
                className="inline-flex h-10 items-center rounded-xl bg-amber-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await rejectMembershipApplication({
                        applicationId: app.id,
                        reason: rejectReason.trim() || undefined,
                      });
                      setShowRejectDialog(false);
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Ablehnung fehlgeschlagen");
                      setShowRejectDialog(false);
                    }
                  });
                }}
              >
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPaymentDialog ? (
        <EmailDialogShell
          title="Zahlungserinnerung"
          description="Vorlage unter Admin → E-Mail-Vorlagen. Signatur unter Admin → Unterschriften."
          onClose={() => setShowPaymentDialog(false)}
          footer={
            <button
              type="button"
              disabled={pending || paymentLoading || !paymentSignatureId}
              className="fc-btn-primary h-10 disabled:opacity-50"
              onClick={() => {
                startTransition(async () => {
                  try {
                    await sendPaymentReminderEmail({
                      applicationId: app.id,
                      subject: paymentSubject,
                      body: paymentBody,
                      signatureId: paymentSignatureId,
                    });
                    setShowPaymentDialog(false);
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Versand fehlgeschlagen");
                  }
                });
              }}
            >
              Senden
            </button>
          }
        >
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Signatur</span>
            <select
              value={paymentSignatureId}
              disabled={paymentLoading}
              onChange={(e) => onPaymentSignatureChange(e.target.value)}
              className="h-11 rounded-xl border px-3 text-sm"
            >
              {paymentSignatures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 grid gap-1">
            <span className="text-sm font-medium text-slate-700">Betreff</span>
            <input
              value={paymentSubject}
              onChange={(e) => setPaymentSubject(e.target.value)}
              className="h-11 rounded-xl border px-3 text-sm"
            />
          </label>
          <label className="mt-3 grid gap-1">
            <span className="text-sm font-medium text-slate-700">Nachricht</span>
            <textarea
              value={paymentBody}
              onChange={(e) => setPaymentBody(e.target.value)}
              rows={10}
              className="rounded-xl border px-3 py-2 text-sm"
            />
          </label>
        </EmailDialogShell>
      ) : null}
    </div>
  );
}
