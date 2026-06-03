"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMembershipFormInviteDraft,
  getMembershipFormLinkAction,
  sendMembershipFormInviteEmail,
} from "@/app/(app)/admin/membership-form/actions";
import type { MailSignatureOption } from "@/lib/email/signatures";

export function MembershipFormLinkClient({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showMailDialog, setShowMailDialog] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [greetingName, setGreetingName] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [signatures, setSignatures] = useState<MailSignatureOption[]>([]);
  const [signatureId, setSignatureId] = useState("");
  const [mailLoading, setMailLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getMembershipFormLinkAction().then((r) => setUrl(r.url));
  }, []);

  async function copyLink() {
    setError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren fehlgeschlagen — Link manuell markieren und kopieren.");
    }
  }

  const loadDraft = useCallback(async (sigId?: string, name?: string) => {
    setMailLoading(true);
    try {
      const draft = await getMembershipFormInviteDraft({
        signatureId: sigId,
        greetingName: name,
      });
      setMailSubject(draft.subject);
      setMailBody(draft.body);
      setSignatures(draft.signatures);
      setSignatureId(draft.defaultSignatureId);
      setUrl(draft.applicationUrl);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorlage konnte nicht geladen werden");
      return false;
    } finally {
      setMailLoading(false);
    }
  }, []);

  async function openMailDialog() {
    setError(null);
    setMessage(null);
    const ok = await loadDraft(undefined, greetingName);
    if (ok) setShowMailDialog(true);
  }

  async function onSignatureChange(id: string) {
    setSignatureId(id);
    await loadDraft(id, greetingName);
  }

  return (
    <div className="grid gap-4">
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Link zum Antragsformular</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-slate-600">
            Öffentliche Seite für den digitalen Mitgliedsantrag. Vorlage bearbeiten unter{" "}
            <Link href="/admin/settings/email-templates" className="font-medium text-blue-600 hover:underline">
              E-Mail-Vorlagen
            </Link>{" "}
            („Einladung Antragsformular“).
          </p>
          <div className="break-all rounded-xl border bg-slate-50 p-3 font-mono text-sm text-slate-800">
            {url}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
            >
              {copied ? "Kopiert ✓" : "Link kopieren"}
            </button>
            <button
              type="button"
              onClick={() => void openMailDialog()}
              disabled={mailLoading}
              className="h-10 rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Per E-Mail versenden
            </button>
            <Link
              href="/mitgliedschaft"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-xl border bg-white px-4 text-sm font-semibold text-blue-700"
            >
              Formular öffnen
            </Link>
          </div>
        </CardContent>
      </Card>

      {showMailDialog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Antragslink per E-Mail</h3>
            <label className="mt-3 grid gap-1">
              <span className="text-sm font-medium text-slate-700">E-Mail Empfänger/in *</span>
              <input
                type="email"
                value={mailTo}
                onChange={(e) => setMailTo(e.target.value)}
                className="h-11 rounded-xl border px-3 text-sm"
                placeholder="name@beispiel.de"
              />
            </label>
            <label className="mt-3 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Anrede (nach „Hey“)</span>
              <input
                value={greetingName}
                onChange={(e) => setGreetingName(e.target.value)}
                onBlur={(e) => void loadDraft(signatureId, e.target.value)}
                className="h-11 rounded-xl border px-3 text-sm"
                placeholder="z. B. Vorname — leer = „du“"
              />
            </label>
            <label className="mt-3 grid gap-1">
              <span className="text-sm font-medium text-slate-700">Signatur</span>
              <select
                value={signatureId}
                disabled={mailLoading}
                onChange={(e) => void onSignatureChange(e.target.value)}
                className="h-11 rounded-xl border px-3 text-sm"
              >
                {signatures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
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
                className="rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="h-10 rounded-xl border px-4 text-sm font-semibold"
                onClick={() => setShowMailDialog(false)}
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={pending || mailLoading || !mailTo.trim() || !signatureId}
                className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await sendMembershipFormInviteEmail({
                        to: mailTo,
                        subject: mailSubject,
                        body: mailBody,
                        signatureId,
                        greetingName,
                      });
                      setShowMailDialog(false);
                      setMessage(`E-Mail an ${mailTo} gesendet.`);
                      setError(null);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Versand fehlgeschlagen");
                    }
                  });
                }}
              >
                Senden
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
