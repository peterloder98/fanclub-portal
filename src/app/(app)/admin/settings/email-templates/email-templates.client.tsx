"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cake, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { BirthdayTemplatesPanel } from "@/components/admin/birthday-templates-panel.client";
import { TEMPLATE_PLACEHOLDERS, type EmailTemplateKey } from "@/lib/email/template-keys";
import {
  loadEmailTemplatesAction,
  saveEmailTemplateAction,
} from "./actions";

type TemplateRow = {
  key: string;
  name: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  description: string | null;
};

type TabId = "email" | "birthday";

export function EmailTemplatesClient({ initialTab = "email" }: { initialTab?: TabId }) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await loadEmailTemplatesAction();
      setTemplates(rows as TemplateRow[]);
      return rows as TemplateRow[];
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const rows = await reload();
      if (rows.length) selectTemplate(rows[0]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTemplate(t: TemplateRow) {
    setActiveKey(t.key);
    setSubject(t.subject);
    setBodyText(t.body_text);
    setBodyHtml(t.body_html ?? "");
    setMessage(null);
    setError(null);
  }

  const placeholders = activeKey
    ? TEMPLATE_PLACEHOLDERS[activeKey as EmailTemplateKey] ?? []
    : [];

  const active = templates.find((t) => t.key === activeKey);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("email")}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
            tab === "email"
              ? "bg-slate-900 text-white"
              : "border bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          <Mail className="h-4 w-4" aria-hidden />
          E-Mail-Vorlagen
        </button>
        <button
          type="button"
          onClick={() => setTab("birthday")}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
            tab === "birthday"
              ? "bg-slate-900 text-white"
              : "border bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          <Cake className="h-4 w-4" aria-hidden />
          Vorlagen Geburtstagsgruß
        </button>
      </div>

      {tab === "birthday" ? (
        <BirthdayTemplatesPanel />
      ) : (
        <>
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
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Signatur in Vorlagen</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p>
                Vorlagen und automatische System-E-Mails nutzen immer die allgemeine{" "}
                <span className="font-medium text-slate-800">Fanclub-Signatur</span> über{" "}
                <code className="text-xs">{`{{admin_signature_text}}`}</code>. Persönliche
                Admin-Unterschriften können nur beim manuellen Versand einzelner E-Mails gewählt
                werden.
              </p>
              <Link
                href="/admin/signatures"
                className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
              >
                Fanclub-Signatur bearbeiten →
              </Link>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-sm text-slate-600">Lade Vorlagen…</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Vorlagen</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1 p-2">
                  {templates.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => selectTemplate(t)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-left text-sm transition",
                        t.key === activeKey
                          ? "bg-slate-900 font-semibold text-white"
                          : "text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      {t.name}
                    </button>
                  ))}
                  <Link
                    href="/admin/signatures"
                    className="mt-2 block rounded-xl px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
                  >
                    Signaturen bearbeiten →
                  </Link>
                </CardContent>
              </Card>

              {active ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{active.name}</CardTitle>
                    {active.description ? (
                      <p className="text-sm text-slate-600">{active.description}</p>
                    ) : null}
                  </CardHeader>
                  <CardContent>
                    <form
                      className="grid gap-4"
                      action={async (fd) => {
                        setBusy(true);
                        setError(null);
                        try {
                          await saveEmailTemplateAction(fd);
                          setMessage("Vorlage gespeichert.");
                          await reload();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <input type="hidden" name="key" value={active.key} />

                      <label className="grid gap-1">
                        <span className="text-sm font-medium text-slate-700">Betreff</span>
                        <input
                          name="subject"
                          required
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                        />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-sm font-medium text-slate-700">Nachricht (Text)</span>
                        <textarea
                          name="body_text"
                          required
                          rows={14}
                          value={bodyText}
                          onChange={(e) => setBodyText(e.target.value)}
                          className="rounded-xl border bg-white px-3 py-2 font-mono text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                        />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-sm font-medium text-slate-700">
                          HTML (optional)
                        </span>
                        <textarea
                          name="body_html"
                          rows={6}
                          value={bodyHtml}
                          onChange={(e) => setBodyHtml(e.target.value)}
                          placeholder="Leer = automatisch aus Text"
                          className="rounded-xl border bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                        />
                      </label>

                      <div className="rounded-xl border bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <div className="font-semibold text-slate-800">Platzhalter</div>
                        <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
                          {placeholders.map((p) => (
                            <li key={p.key}>
                              <code className="text-[11px]">{`{{${p.key}}}`}</code> — {p.label}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="submit"
                        disabled={busy}
                        className="h-11 w-full max-w-xs rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {busy ? "Speichern…" : "Vorlage speichern"}
                      </button>
                    </form>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
