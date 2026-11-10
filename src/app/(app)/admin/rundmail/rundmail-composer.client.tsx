"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BOARD_RUNDMAIL_ACCEPT,
  BOARD_RUNDMAIL_ANREDE_TOKEN,
  BOARD_RUNDMAIL_MAX_SUBJECT,
  BOARD_RUNDMAIL_MAX_HTML_CHARS,
  BOARD_RUNDMAIL_VORNAME_TOKEN,
  boardRundmailFilesError,
  isBoardEmailBodyEmpty,
  normalizeBoardLinkUrl,
  type BoardRundmailSendResult,
} from "@/lib/email/board-rundmail-content";
import type { RundmailRecipient } from "@/lib/email/board-rundmail-recipients";
import { sendBoardRundmailAction } from "./actions";

function displayName(recipient: RundmailRecipient) {
  const name = `${recipient.firstName} ${recipient.lastName}`.trim();
  return name || "Mitglied";
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function successText(result: Extract<BoardRundmailSendResult, { ok: true }>) {
  const parts = [
    result.delivered
      ? result.queued === 1
        ? "Die Mail ist an 1 Mitglied raus."
        : `Die Mail ist an ${result.queued} Mitglieder raus.`
      : result.queued === 1
        ? "Die Mail steht in der Warteschlange für 1 Mitglied."
        : `Die Mail steht in der Warteschlange für ${result.queued} Mitglieder.`,
  ];
  if (result.notQueued > 0) {
    parts.push(
      result.delivered
        ? result.notQueued === 1
          ? "1 Mail konnte nicht verschickt werden."
          : `${result.notQueued} Mails konnten nicht verschickt werden.`
        : result.notQueued === 1
          ? "1 Mail konnte nicht eingereiht werden."
          : `${result.notQueued} Mails konnten nicht eingereiht werden.`,
    );
  }
  if (result.skippedIneligible > 0) {
    parts.push(
      result.skippedIneligible === 1
        ? "1 Person aus der Auswahl ist nicht aktiv oder ohne E-Mail und wurde ausgelassen."
        : `${result.skippedIneligible} Personen aus der Auswahl sind nicht aktiv oder ohne E-Mail und wurden ausgelassen.`,
    );
  }
  if (!result.delivered) {
    parts.push("Der Versand über das Club-Postfach läuft und kann einige Minuten dauern.");
  }
  return parts.join(" ");
}

export function RundmailComposer({ recipients }: { recipients: RundmailRecipient[] }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(recipients.map((r) => r.userId)));
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const allRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return recipients;
    return recipients.filter((recipient) => {
      const name = displayName(recipient).toLowerCase();
      return name.includes(query) || recipient.email.toLowerCase().includes(query);
    });
  }, [recipients, search]);

  const allSelected = recipients.length > 0 && selected.size === recipients.length;
  const someSelected = selected.size > 0 && !allSelected;

  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(recipients.map((recipient) => recipient.userId)));
  }

  function toggleOne(userId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function formatCommand(command: "bold" | "italic") {
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(command);
  }

  function insertToken(token: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const inserted = document.execCommand("insertText", false, token);
    if (!inserted) editor.append(document.createTextNode(token));
  }

  function insertSubjectToken(token: string) {
    const field = subjectRef.current;
    const start = field?.selectionStart ?? subject.length;
    const end = field?.selectionEnd ?? subject.length;
    const next = subject.slice(0, start) + token + subject.slice(end);
    if (next.length > BOARD_RUNDMAIL_MAX_SUBJECT) {
      setError(`Der Betreff ist zu lang (höchstens ${BOARD_RUNDMAIL_MAX_SUBJECT} Zeichen).`);
      setSuccess(null);
      return;
    }
    setSubject(next);
    setError(null);
    requestAnimationFrame(() => {
      field?.focus();
      const pos = start + token.length;
      field?.setSelectionRange(pos, pos);
    });
  }

  function openLink() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) savedRange.current = selection.getRangeAt(0).cloneRange();
    const anchor = selection?.anchorNode;
    const element = anchor instanceof Element ? anchor : anchor?.parentElement;
    setLinkUrl(element?.closest("a")?.getAttribute("href") ?? "");
    setLinkError(null);
    setLinkOpen(true);
  }

  function applyLink() {
    const url = normalizeBoardLinkUrl(linkUrl);
    if (!url) {
      setLinkError("Bitte eine gültige Internetadresse eingeben.");
      return;
    }
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (savedRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    const anchor = selection?.anchorNode;
    const element = anchor instanceof Element ? anchor : anchor?.parentElement;
    const existing = element?.closest("a");
    if (existing && editor.contains(existing)) {
      existing.setAttribute("href", url);
    } else {
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("createLink", false, url);
    }
    setLinkOpen(false);
    setLinkError(null);
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const next = [...files, ...Array.from(list)];
    const message = boardRundmailFilesError(next.map((file) => ({ name: file.name, size: file.size })));
    if (message) {
      setError(message);
      setSuccess(null);
    } else {
      setFiles(next);
      setError(null);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const html = editorRef.current?.innerHTML ?? "";
    const subjectTrim = subject.trim();
    if (selected.size === 0) {
      setError("Bitte mindestens ein Mitglied auswählen.");
      return;
    }
    if (!subjectTrim) {
      setError("Bitte einen Betreff eingeben.");
      return;
    }
    if (subjectTrim.length > BOARD_RUNDMAIL_MAX_SUBJECT) {
      setError(`Der Betreff ist zu lang (höchstens ${BOARD_RUNDMAIL_MAX_SUBJECT} Zeichen).`);
      return;
    }
    if (html.length > BOARD_RUNDMAIL_MAX_HTML_CHARS) {
      setError("Der Text ist zu lang.");
      return;
    }
    if (isBoardEmailBodyEmpty(html)) {
      setError("Bitte einen Text schreiben.");
      return;
    }
    const fileError = boardRundmailFilesError(files.map((file) => ({ name: file.name, size: file.size })));
    if (fileError) {
      setError(fileError);
      return;
    }
    const count = selected.size;
    const question =
      count === 1 ? "Mail an 1 Mitglied senden?" : `Mail an ${count} Mitglieder senden?`;
    if (!window.confirm(question)) return;

    const formData = new FormData();
    formData.set("subject", subjectTrim);
    formData.set("html", html);
    formData.set("recipientIds", JSON.stringify([...selected]));
    for (const file of files) formData.append("files", file);

    setBusy(true);
    try {
      const result = await sendBoardRundmailAction(formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccess(successText(result));
    } catch {
      setError("Die Mail konnte nicht vorbereitet werden. Bitte später erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <p className="text-sm leading-relaxed text-slate-600">
        Die Mail geht über das normale Club-Postfach, an jede Person einzeln. „Alle“ sind die aktiven
        Mitglieder mit eigener E-Mail. Versteckte Konten und Mitglieder ohne E-Mail stehen nicht in der Liste.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Empfänger</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              {recipients.length === 0
                ? "Keine aktiven Mitglieder mit E-Mail."
                : `${selected.size} von ${recipients.length} ausgewählt`}
            </p>
          </CardHeader>
          <CardContent className="grid gap-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name oder E-Mail suchen"
              aria-label="Mitglieder suchen"
              className="h-10 w-full rounded-xl border px-3 text-sm"
              autoComplete="off"
            />
            <p className="text-xs leading-relaxed text-slate-500">
              Die Suche blendet nur Namen aus. „Alle“ gilt für die ganze Liste.
            </p>
            <label className="flex items-center gap-3 rounded-xl border px-3 py-2">
              <input
                ref={allRef}
                type="checkbox"
                className="h-4 w-4"
                checked={allSelected}
                disabled={recipients.length === 0}
                onChange={toggleAll}
              />
              <span className="text-sm font-semibold text-fc-navy">Alle</span>
            </label>
            <div className="max-h-96 overflow-y-auto rounded-xl border" role="group" aria-label="Empfänger">
              {visible.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500">Niemand passt zur Suche.</p>
              ) : (
                visible.map((recipient) => (
                  <label
                    key={recipient.userId}
                    className="flex cursor-pointer items-start gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={selected.has(recipient.userId)}
                      onChange={() => toggleOne(recipient.userId)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fc-navy">
                        {displayName(recipient)}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{recipient.email}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <form onSubmit={onSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Nachricht</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                Vorname wird zum Vornamen, Anrede zum Beispiel zu „Lieber Max“. Die Fanclub-Unterschrift
                wird automatisch angehängt.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-fc-navy">
                Betreff
                <input
                  ref={subjectRef}
                  value={subject}
                  maxLength={BOARD_RUNDMAIL_MAX_SUBJECT}
                  onChange={(event) => setSubject(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                  className="h-10 w-full rounded-xl border px-3 text-sm font-normal text-slate-900"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="fc-btn-secondary h-9 px-3" onClick={() => insertSubjectToken(BOARD_RUNDMAIL_VORNAME_TOKEN)}>
                  Vorname
                </button>
                <button type="button" className="fc-btn-secondary h-9 px-3" onClick={() => insertSubjectToken(BOARD_RUNDMAIL_ANREDE_TOKEN)}>
                  Anrede
                </button>
              </div>

              <div className="grid gap-1">
                <span className="text-sm font-medium text-fc-navy">Text</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="fc-btn-secondary h-9 px-3 font-bold"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => formatCommand("bold")}
                  >
                    Fett
                  </button>
                  <button
                    type="button"
                    className="fc-btn-secondary h-9 px-3 italic"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => formatCommand("italic")}
                  >
                    Kursiv
                  </button>
                  <button
                    type="button"
                    className="fc-btn-secondary h-9 px-3"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={openLink}
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    className="fc-btn-secondary h-9 px-3"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertToken(BOARD_RUNDMAIL_VORNAME_TOKEN)}
                  >
                    Vorname
                  </button>
                  <button
                    type="button"
                    className="fc-btn-secondary h-9 px-3"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertToken(BOARD_RUNDMAIL_ANREDE_TOKEN)}
                  >
                    Anrede
                  </button>
                </div>
                {linkOpen ? (
                  <div className="grid gap-2 rounded-xl border bg-slate-50 p-3">
                    <label className="grid gap-1 text-sm text-fc-navy">
                      Link-Adresse
                      <input
                        value={linkUrl}
                        onChange={(event) => setLinkUrl(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            applyLink();
                          }
                          if (event.key === "Escape") setLinkOpen(false);
                        }}
                        placeholder="https://"
                        className="h-10 w-full rounded-xl border bg-white px-3 text-sm"
                        autoFocus
                      />
                    </label>
                    {linkError ? <p className="text-sm text-rose-700">{linkError}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="fc-btn-primary h-9" onClick={applyLink}>
                        Übernehmen
                      </button>
                      <button type="button" className="fc-btn-secondary h-9" onClick={() => setLinkOpen(false)}>
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : null}
                <div
                  ref={editorRef}
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Mailtext"
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-48 rounded-xl border px-3 py-2 text-sm leading-relaxed text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--ring)] [&_a]:text-fc-blue [&_a]:underline"
                />
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-medium text-fc-navy">Anhänge</span>
                <p className="text-xs leading-relaxed text-slate-500">
                  PDF, Bilder oder Office-Dateien (Word, Excel, PowerPoint). Höchstens 5 Dateien, zusammen
                  höchstens 3 MB.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept={BOARD_RUNDMAIL_ACCEPT}
                  className="hidden"
                  onChange={(event) => addFiles(event.target.files)}
                />
                <button type="button" className="fc-btn-secondary w-fit" onClick={() => fileRef.current?.click()}>
                  Datei hinzufügen
                </button>
                {files.length > 0 ? (
                  <ul className="grid gap-1">
                    {files.map((file, index) => (
                      <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-slate-700">
                          {file.name}{" "}
                          <span className="text-slate-500">({formatBytes(file.size)})</span>
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-sm font-medium text-fc-blue hover:underline"
                          onClick={() => setFiles(files.filter((_, fileIndex) => fileIndex !== index))}
                        >
                          Entfernen
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {error ? (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  {success}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-sm font-semibold text-fc-navy">
                  {selected.size === 1 ? "1 Mitglied ausgewählt" : `${selected.size} Mitglieder ausgewählt`}
                </p>
                <button type="submit" className="fc-btn-primary" disabled={busy || recipients.length === 0}>
                  {busy ? "Wird eingereiht…" : "Mail senden"}
                </button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
