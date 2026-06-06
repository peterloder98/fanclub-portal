"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMembershipFormLinkAction } from "@/app/(app)/admin/membership-form/actions";
import { MembershipInviteEmailDialog } from "@/components/membership/membership-invite-email-dialog";

export function MembershipFormLinkClient({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [copied, setCopied] = useState(false);
  const [showMailDialog, setShowMailDialog] = useState(false);
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
            <Link href="/admin/settings/email-templates" className="font-medium text-fc-blue hover:underline">
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
              className="h-10 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white"
            >
              {copied ? "Kopiert ✓" : "Link kopieren"}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setShowMailDialog(true);
              }}
              className="h-10 rounded-xl border bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Per E-Mail versenden
            </button>
            <Link
              href="/mitgliedschaft"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-xl border bg-white px-4 text-sm font-semibold text-fc-blue"
            >
              Formular öffnen
            </Link>
          </div>
        </CardContent>
      </Card>

      <MembershipInviteEmailDialog
        open={showMailDialog}
        variant="admin"
        onClose={() => setShowMailDialog(false)}
        onSent={(msg) => {
          setMessage(msg);
          setShowMailDialog(false);
        }}
      />
    </div>
  );
}
