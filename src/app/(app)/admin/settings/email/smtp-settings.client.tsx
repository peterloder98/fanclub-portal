"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SmtpAccountPublic, SmtpEncryption } from "@/lib/smtp/types";
import {
  createSmtpAccountAction,
  deleteSmtpAccountAction,
  loadSmtpAccountsAction,
  sendSmtpTestMailAction,
  setDefaultSmtpAccountAction,
  testSmtpAccountAction,
  updateSmtpAccountAction,
} from "./actions";

const ENCRYPTIONS: SmtpEncryption[] = ["SSL", "TLS", "STARTTLS", "NONE"];

export function SmtpSettingsClient() {
  const [accounts, setAccounts] = useState<SmtpAccountPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<SmtpAccountPublic | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loadSmtpAccountsAction();
      setAccounts(res.accounts);
      if (!res.ok) setError(res.error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onTest(id: string, sendMail = false) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      if (sendMail) {
        const r = await sendSmtpTestMailAction(id);
        if (!r.ok) setError(r.error);
        else setMessage(`Test-Mail gesendet an ${r.to}`);
      } else {
        const r = await testSmtpAccountAction(id);
        if (!r.ok) setError(r.error);
        else setMessage(`SMTP-Verbindung erfolgreich (${r.email}).`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Link
        href="/admin/settings/email-templates"
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        E-Mail-Vorlagen bearbeiten →
      </Link>
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
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>SMTP-Konten</CardTitle>
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing("new")}
            className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
          >
            Neues Konto
          </button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-600">Lade…</div>
          ) : accounts.length === 0 ? (
            <div className="text-sm text-slate-600">
              Noch kein Konto. Lege eines an oder setze SMTP_SEED_* in{" "}
              <code className="text-xs">.env.local</code> und lade die Seite neu.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-600">
                    <th className="py-2 pr-2">Host</th>
                    <th className="py-2 pr-2">Port</th>
                    <th className="py-2 pr-2">E-Mail</th>
                    <th className="py-2 pr-2">Anzeigename</th>
                    <th className="py-2 pr-2">Standard</th>
                    <th className="py-2">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100">
                      <td className="py-2 pr-2">{a.server}</td>
                      <td className="py-2 pr-2">{a.port}</td>
                      <td className="py-2 pr-2">{a.email}</td>
                      <td className="py-2 pr-2">{a.display_name ?? "—"}</td>
                      <td className="py-2 pr-2">
                        {a.is_default ? <Badge variant="brand">Standard</Badge> : null}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded-lg border px-2 py-1 text-xs"
                            onClick={() => setEditing(a)}
                          >
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded-lg border px-2 py-1 text-xs"
                            onClick={() => void onTest(a.id)}
                          >
                            Verbindung testen
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded-lg border px-2 py-1 text-xs"
                            onClick={() => void onTest(a.id, true)}
                          >
                            Test-Mail
                          </button>
                          {!a.is_default ? (
                            <button
                              type="button"
                              disabled={busy}
                              className="rounded-lg border px-2 py-1 text-xs"
                              onClick={() =>
                                void setDefaultSmtpAccountAction(a.id).then(() => reload())
                              }
                            >
                              Als Standard
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy || accounts.length <= 1}
                            className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700"
                            onClick={() => {
                              if (!confirm("SMTP-Konto wirklich löschen?")) return;
                              void deleteSmtpAccountAction(a.id).then(() => reload());
                            }}
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>{editing === "new" ? "Neues SMTP-Konto" : "SMTP-Konto bearbeiten"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              action={async (fd) => {
                setBusy(true);
                setError(null);
                try {
                  if (editing === "new") await createSmtpAccountAction(fd);
                  else {
                    fd.set("id", editing.id);
                    await updateSmtpAccountAction(fd);
                  }
                  setEditing(null);
                  await reload();
                  setMessage("Gespeichert.");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-sm font-medium">Host</span>
                <input name="server" required defaultValue={editing === "new" ? "" : editing.server} className="h-11 rounded-xl border px-3 text-sm" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium">Port</span>
                <input name="port" type="number" required defaultValue={editing === "new" ? 465 : editing.port} className="h-11 rounded-xl border px-3 text-sm" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium">Verschlüsselung</span>
                <select name="encryption" defaultValue={editing === "new" ? "SSL" : editing.encryption} className="h-11 rounded-xl border px-3 text-sm">
                  {ENCRYPTIONS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-sm font-medium">E-Mail / Login</span>
                <input name="email" type="email" required defaultValue={editing === "new" ? "" : editing.email} className="h-11 rounded-xl border px-3 text-sm" />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-sm font-medium">
                  Passwort{editing !== "new" ? " (leer = unverändert)" : ""}
                </span>
                <input name="password" type="password" required={editing === "new"} className="h-11 rounded-xl border px-3 text-sm" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium">Anzeigename</span>
                <input name="display_name" defaultValue={editing === "new" ? "" : editing.display_name ?? ""} className="h-11 rounded-xl border px-3 text-sm" />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium">Antwortadresse</span>
                <input name="reply_to" defaultValue={editing === "new" ? "" : editing.reply_to ?? ""} className="h-11 rounded-xl border px-3 text-sm" />
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  name="is_default"
                  defaultChecked={editing === "new" ? accounts.length === 0 : editing.is_default}
                  className="h-4 w-4"
                />
                <span className="text-sm">Standard-Konto</span>
              </label>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button type="submit" disabled={busy} className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">
                  Speichern
                </button>
                <button type="button" disabled={busy} onClick={() => setEditing(null)} className="h-11 rounded-xl border px-4 text-sm">
                  Abbrechen
                </button>
                {editing !== "new" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onTest(editing.id)}
                    className="h-11 rounded-xl border px-4 text-sm"
                  >
                    Jetzt Erreichbarkeit testen
                  </button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
