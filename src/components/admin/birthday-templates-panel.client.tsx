"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listBirthdayTemplatePreviews } from "@/lib/birthday/templates";
import {
  createBirthdayTemplateAction,
  deleteBirthdayTemplateAction,
  loadBirthdayTemplatesAction,
  saveBirthdayTemplateAction,
} from "@/app/(app)/admin/settings/email-templates/actions";

type BirthdayRow = {
  id: string;
  title_template: string;
  body_template: string;
  sort_order: number;
  is_active: boolean;
};

export function BirthdayTemplatesPanel() {
  const [rows, setRows] = useState<BirthdayRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [titleTemplate, setTitleTemplate] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("Alles Gute, {{first_name}}! 🎂");
  const [newBody, setNewBody] = useState(
    "{{salutation}}, wir wünschen dir alles Gute zum Geburtstag!",
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await loadBirthdayTemplatesAction();
      setTableMissing(res.tableMissing);
      setRows(res.rows as BirthdayRow[]);
      return res.rows as BirthdayRow[];
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const list = await reload();
      if (list.length) selectRow(list[0] as BirthdayRow);
    })();
  }, [reload]);

  function selectRow(r: BirthdayRow) {
    setActiveId(r.id);
    setTitleTemplate(r.title_template);
    setBodyTemplate(r.body_template);
    setIsActive(r.is_active);
    setShowNewForm(false);
    setMessage(null);
    setError(null);
  }

  const active = rows.find((r) => r.id === activeId);
  const previews = listBirthdayTemplatePreviews(
    "Max",
    "m",
    rows.filter((r) => r.is_active).map((r) => ({
      title_template: r.title_template,
      body_template: r.body_template,
    })),
  );

  async function handleSave() {
    if (!activeId) return;
    setBusy(true);
    setError(null);
    try {
      await saveBirthdayTemplateAction({
        id: activeId,
        title_template: titleTemplate,
        body_template: bodyTemplate,
        is_active: isActive,
      });
      setMessage("Geburtstagsvorlage gespeichert.");
      const list = await reload();
      const updated = list.find((r) => r.id === activeId);
      if (updated) selectRow(updated as BirthdayRow);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const { id } = await createBirthdayTemplateAction({
        title_template: newTitle,
        body_template: newBody,
      });
      setMessage("Neue Vorlage angelegt.");
      setShowNewForm(false);
      const list = await reload();
      const created = list.find((r) => r.id === id);
      if (created) selectRow(created as BirthdayRow);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anlegen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!activeId || !window.confirm("Diese Vorlage wirklich löschen?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteBirthdayTemplateAction(activeId);
      setMessage("Vorlage gelöscht.");
      const list = await reload();
      if (list.length) selectRow(list[0] as BirthdayRow);
      else setActiveId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (tableMissing) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-amber-800">
          Tabelle fehlt. Bitte{" "}
          <code className="rounded bg-amber-100 px-1">supabase/050_birthday_greeting_templates.sql</code>{" "}
          im SQL Editor ausführen.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card className="border-sky-100 bg-gradient-to-br from-sky-50/50 to-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Geburtstagsposts — Ablauf</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-slate-700">
          <p>
            Täglich um <strong>08:00 (Berlin)</strong> wird pro Geburtstagskind ein Post erstellt.
            Die Vorlage wird per Hash aus Mitglied-ID und Datum gewählt — gleiches Kind, gleicher Tag =
            immer dieselbe Vorlage.
          </p>
          <p>
            Angeheftet bis <strong>23:59</strong>. Cron:{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">/api/cron/birthday-posts</code>
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-sm text-slate-600">Lade Vorlagen…</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Vorlagen</CardTitle>
              <button
                type="button"
                onClick={() => {
                  setShowNewForm(true);
                  setActiveId(null);
                }}
                className="text-xs font-semibold text-fc-blue hover:underline"
              >
                + Neu
              </button>
            </CardHeader>
            <CardContent className="grid gap-1 p-2">
              {rows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => selectRow(r)}
                  className={`rounded-xl px-3 py-2 text-left text-sm transition ${
                    r.id === activeId && !showNewForm
                      ? "bg-fc-navy font-semibold text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="block truncate">{r.title_template}</span>
                  {!r.is_active ? (
                    <span className="text-[10px] opacity-70">(inaktiv)</span>
                  ) : null}
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {showNewForm ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Neue Geburtstagsvorlage</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-700">Post-Titel</span>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="h-11 rounded-xl border px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-700">Post-Text</span>
                    <textarea
                      value={newBody}
                      onChange={(e) => setNewBody(e.target.value)}
                      rows={6}
                      className="rounded-xl border px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleCreate()}
                    className="h-10 max-w-xs rounded-xl bg-fc-navy text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Vorlage anlegen
                  </button>
                </CardContent>
              </Card>
            ) : active ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vorlage bearbeiten</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-700">Post-Titel</span>
                    <input
                      value={titleTemplate}
                      onChange={(e) => setTitleTemplate(e.target.value)}
                      className="h-11 rounded-xl border px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm font-medium text-slate-700">Post-Text</span>
                    <textarea
                      value={bodyTemplate}
                      onChange={(e) => setBodyTemplate(e.target.value)}
                      rows={8}
                      className="rounded-xl border px-3 py-2 font-mono text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    Aktiv (wird bei der Rotation berücksichtigt)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSave()}
                      className="h-10 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Speichern
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete()}
                      className="h-10 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-800 disabled:opacity-50"
                    >
                      Löschen
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {previews.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vorschau (Beispiel: Max)</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {previews.map((p) => (
                    <div key={p.index} className="rounded-xl border bg-slate-50/80 p-3 text-sm">
                      <p className="font-semibold text-fc-navy">{p.title}</p>
                      <p className="mt-1 text-slate-700">{p.body}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="font-semibold text-slate-800">Platzhalter: </span>
        <code>{`{{first_name}}`}</code> — Vorname · <code>{`{{salutation}}`}</code> — Lieber/Liebe/Liebe/r …
      </div>

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
    </div>
  );
}
