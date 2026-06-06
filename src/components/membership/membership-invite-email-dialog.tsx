"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { flyPointsFromElement } from "@/lib/points/fly";
import {
  getMembershipFormInviteDraft,
  sendMembershipFormInviteEmail,
} from "@/app/(app)/admin/membership-form/actions";
import {
  getMemberReferralPrefillAction,
  sendMemberReferralEmailAction,
} from "@/app/(app)/mitgliedschaft/einladen/actions";
import { replaceHeyRecipient } from "@/lib/email/replace-hey-greeting";
import { composeMemberReferralBody } from "@/lib/email/member-referral-template";
import { replaceTrailingSignature } from "@/lib/email/signature-body";
import type { MailSignatureOption } from "@/lib/email/signatures";
import { EmailDialogShell } from "@/components/ui/email-dialog-shell";

type Variant = "admin" | "member";

export function MembershipInviteEmailDialog({
  open,
  onClose,
  variant,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  variant: Variant;
  onSent?: (message: string, pointsAwarded?: number) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [mailTo, setMailTo] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [greetingName, setGreetingName] = useState("");
  const [heyNameInBody, setHeyNameInBody] = useState("du");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [applicationLink, setApplicationLink] = useState("");
  const [signatures, setSignatures] = useState<MailSignatureOption[]>([]);
  const [signatureId, setSignatureId] = useState("");
  const [signatureTexts, setSignatureTexts] = useState<Record<string, string>>({});
  const [activeSignatureText, setActiveSignatureText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);

  const isAdmin = variant === "admin";

  const loadAdminDraft = useCallback(async (sigId?: string, name?: string) => {
    const draft = await getMembershipFormInviteDraft({
      signatureId: sigId,
      greetingName: name,
    });
    setMailSubject(draft.subject);
    setMailBody(draft.body);
    setSignatures(draft.signatures);
    setSignatureId(draft.defaultSignatureId);
    setSignatureTexts(draft.signatureTexts);
    setActiveSignatureText(draft.signatureTexts[draft.defaultSignatureId] ?? "");
    setApplicationLink(draft.applicationUrl);
    const used = (name?.trim() || "du");
    setHeyNameInBody(used);
    setGreetingName(name ?? "");
  }, []);

  const loadMemberDraft = useCallback(async () => {
    const prefill = await getMemberReferralPrefillAction();
    setMailSubject(prefill.subject);
    setApplicationLink(prefill.applicationLink);
    setSenderName(prefill.senderName);
    setMailBody(prefill.body);
    setRecipientName("");
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    void (async () => {
      try {
        if (isAdmin) {
          await loadAdminDraft(undefined, greetingName);
        } else {
          await loadMemberDraft();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Vorlage konnte nicht geladen werden");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when dialog opens
  }, [open, variant]);

  function onAdminGreetingChange(value: string) {
    setGreetingName(value);
    const next = value.trim() || "du";
    setMailBody((body) => replaceHeyRecipient(body, heyNameInBody, next));
    setHeyNameInBody(next);
  }

  function syncMemberBody(nextRecipient: string, nextSender: string) {
    setMailBody(
      composeMemberReferralBody({
        recipientName: nextRecipient,
        senderName: nextSender,
        applicationLink,
      }),
    );
  }

  function onMemberRecipientChange(value: string) {
    setRecipientName(value);
    syncMemberBody(value, senderName);
  }

  function onMemberSenderChange(value: string) {
    setSenderName(value);
    syncMemberBody(recipientName, value);
  }

  function onSignatureChange(id: string) {
    const nextText = signatureTexts[id] ?? "";
    setMailBody((body) =>
      replaceTrailingSignature(body, activeSignatureText, nextText, Object.values(signatureTexts)),
    );
    setActiveSignatureText(nextText);
    setSignatureId(id);
  }

  const canSend = isAdmin
    ? Boolean(mailTo.trim() && signatureId)
    : Boolean(mailTo.trim() && recipientName.trim() && senderName.trim());

  if (!open) return null;

  const sendFooter = (
    <button
      ref={sendBtnRef}
      type="button"
      disabled={pending || loading || !canSend}
      className="h-10 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white disabled:opacity-50"
      onClick={() => {
        startTransition(async () => {
          try {
            if (isAdmin) {
              await sendMembershipFormInviteEmail({
                to: mailTo,
                subject: mailSubject,
                body: mailBody,
                signatureId,
                greetingName,
              });
              onSent?.(`E-Mail an ${mailTo} gesendet.`, 0);
            } else {
              const result = await sendMemberReferralEmailAction({
                to: mailTo,
                recipientName,
                senderName,
                subject: mailSubject,
                body: mailBody,
              });
              if (result.pointsAwarded > 0) {
                flyPointsFromElement({
                  fromEl: sendBtnRef.current,
                  delta: result.pointsAwarded,
                });
              }
              const ptsHint =
                result.pointsAwarded > 0
                  ? ` +${result.pointsAwarded} Punkte!`
                  : " (Punkte für diese Adresse bereits vergeben.)";
              onSent?.(`Einladung an ${mailTo} gesendet.${ptsHint}`, result.pointsAwarded);
            }
            onClose();
            setError(null);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Versand fehlgeschlagen");
          }
        });
      }}
    >
      Senden
    </button>
  );

  return (
    <EmailDialogShell
      title={isAdmin ? "Antragslink per E-Mail" : "Neues Mitglied werben"}
      description={
        isAdmin
          ? "Versand über die Fanclub-Standard-E-Mail mit Admin-Vorlage und Signatur."
          : "Versand über die Fanclub-Standard-E-Mail. Name und Text werden live in der Nachricht übernommen."
      }
      onClose={onClose}
      footer={sendFooter}
    >
      {error ? (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

        <label className="grid gap-1">
          <span className="text-sm font-medium text-slate-700">E-Mail Empfänger/in *</span>
          <input
            type="email"
            value={mailTo}
            onChange={(e) => setMailTo(e.target.value)}
            className="h-11 rounded-xl border px-3 text-sm"
            placeholder="name@beispiel.de"
          />
        </label>

        {isAdmin ? (
          <label className="mt-3 grid gap-1">
            <span className="text-sm font-medium text-slate-700">Anrede (nach „Hey“)</span>
            <input
              value={greetingName}
              onChange={(e) => onAdminGreetingChange(e.target.value)}
              className="h-11 rounded-xl border px-3 text-sm"
              placeholder="z. B. Vorname — leer = „du“"
            />
          </label>
        ) : (
          <>
            <label className="mt-3 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Name Empfänger/in *</span>
              <input
                value={recipientName}
                onChange={(e) => onMemberRecipientChange(e.target.value)}
                className="h-11 rounded-xl border px-3 text-sm"
                placeholder="Vorname oder Name"
                required
              />
            </label>
            <label className="mt-3 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Dein Name (Absender) *</span>
              <input
                value={senderName}
                onChange={(e) => onMemberSenderChange(e.target.value)}
                className="h-11 rounded-xl border px-3 text-sm"
                placeholder="Wie du unterschreibst"
                required
              />
            </label>
          </>
        )}

        {isAdmin ? (
          <label className="mt-3 grid gap-1">
            <span className="text-sm font-medium text-slate-700">Signatur</span>
            <select
              value={signatureId}
              disabled={loading}
              onChange={(e) => onSignatureChange(e.target.value)}
              className="h-11 rounded-xl border px-3 text-sm"
            >
              {signatures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {isAdmin ? (
          <>
            <label className="mt-3 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Betreff</span>
              <input
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                className="h-11 rounded-xl border px-3 text-sm"
              />
            </label>
            <label className="mt-3 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Nachricht</span>
              <textarea
                value={mailBody}
                onChange={(e) => setMailBody(e.target.value)}
                rows={12}
                disabled={loading}
                className="rounded-xl border px-3 py-2 text-sm disabled:opacity-60"
              />
            </label>
          </>
        ) : (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              E-Mail-Vorschau (fest)
            </p>
            <p className="mt-2 text-sm font-medium text-slate-800">Betreff: {mailSubject}</p>
            <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
              {mailBody}
            </pre>
            <p className="mt-2 text-xs text-slate-500">
              Der Text wird automatisch aus deinen Angaben erzeugt und kann nicht bearbeitet werden.
            </p>
          </div>
        )}
    </EmailDialogShell>
  );
}
