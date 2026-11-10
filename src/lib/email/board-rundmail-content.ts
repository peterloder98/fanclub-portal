import {
  appendSignatureToEmailHtml,
  EMAIL_LINK_STYLE,
  EMAIL_PARAGRAPH_STYLE,
  wrapEmailDocument,
} from "@/lib/email/email-layout";
import { escapePlainTextForHtml } from "@/lib/email/linkify-plain-text";

/** Warteschlangen-Schlüssel — kein Eintrag in den E-Mail-Vorlagen. */
export const BOARD_RUNDMAIL_TEMPLATE_KEY = "board_rundmail";

export const BOARD_RUNDMAIL_VORNAME_TOKEN = "{{Vorname}}";
export const BOARD_RUNDMAIL_ANREDE_TOKEN = "{{Anrede}}";

export const BOARD_RUNDMAIL_MAX_FILES = 5;
export const BOARD_RUNDMAIL_MAX_TOTAL_BYTES = 3 * 1024 * 1024;
export const BOARD_RUNDMAIL_MAX_SUBJECT = 180;
export const BOARD_RUNDMAIL_MAX_HTML_CHARS = 100_000;
export const BOARD_RUNDMAIL_MAX_RECIPIENTS = 5000;

export const BOARD_RUNDMAIL_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp";

type FileKind = "pdf" | "jpeg" | "png" | "gif" | "webp" | "ole" | "zip";

export const BOARD_RUNDMAIL_FILE_TYPES: Record<string, { mime: string; kind: FileKind }> = {
  pdf: { mime: "application/pdf", kind: "pdf" },
  jpg: { mime: "image/jpeg", kind: "jpeg" },
  jpeg: { mime: "image/jpeg", kind: "jpeg" },
  png: { mime: "image/png", kind: "png" },
  gif: { mime: "image/gif", kind: "gif" },
  webp: { mime: "image/webp", kind: "webp" },
  doc: { mime: "application/msword", kind: "ole" },
  xls: { mime: "application/vnd.ms-excel", kind: "ole" },
  ppt: { mime: "application/vnd.ms-powerpoint", kind: "ole" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    kind: "zip",
  },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    kind: "zip",
  },
  pptx: {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    kind: "zip",
  },
  odt: { mime: "application/vnd.oasis.opendocument.text", kind: "zip" },
  ods: { mime: "application/vnd.oasis.opendocument.spreadsheet", kind: "zip" },
  odp: { mime: "application/vnd.oasis.opendocument.presentation", kind: "zip" },
};

const ALLOWED_MIME = new Set(Object.values(BOARD_RUNDMAIL_FILE_TYPES).map((entry) => entry.mime));

export function isAllowedBoardRundmailMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime);
}

const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "br",
  "div",
  "em",
  "i",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "u",
  "ul",
]);

export type BoardRundmailSendResult =
  | {
      ok: true;
      queued: number;
      notQueued: number;
      skippedIneligible: number;
      /** true: SMTP ist in dieser Anfrage gelaufen. false: nur eingereiht. */
      delivered: boolean;
    }
  | { ok: false; message: string };

/** Fehlermeldung für den Vorstand — ohne Adressen oder technische Rohtexte. */
export function boardRundmailDeliveryError(raw: string | null | undefined): string {
  const text = raw ?? "";
  if (/535|authentication credentials|authentication failed|invalid login/i.test(text)) {
    return "Das Club-Postfach hat den Versand abgelehnt. Bitte unter E-Mail-Konten das Passwort prüfen.";
  }
  if (/no_smtp_account/i.test(text)) {
    return "Das Club-Postfach ist noch nicht eingerichtet. Bitte zuerst unter E-Mail-Konten ein Konto anlegen.";
  }
  if (/outbound_test_mode/i.test(text)) {
    return "Diese Adresse ist für den Versand gerade nicht freigegeben.";
  }
  if (/Rundmail konnte nicht aufgebaut|Rundmail-Text|Anhang/i.test(text)) {
    return "Die Mail konnte nicht aufgebaut werden. Bitte erneut versuchen.";
  }
  return "Die Mail konnte nicht verschickt werden. Bitte später erneut versuchen oder in der E-Mail-Historie nachsehen.";
}

function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function displayBoardRundmailFileName(filename: string): string {
  const base = filename.split(/[/\\]/).pop()?.replace(/[\r\n"]/g, "").trim() ?? "";
  return base.slice(0, 80) || "Datei";
}

export function emailAttachmentFilename(filename: string, index: number): string {
  const base = displayBoardRundmailFileName(filename);
  if (base === "Datei") return `anhang-${index + 1}`;
  return base.slice(0, 120);
}

export function boardRundmailFilesError(files: { name: string; size: number }[]): string | null {
  if (files.length > BOARD_RUNDMAIL_MAX_FILES) {
    return `Höchstens ${BOARD_RUNDMAIL_MAX_FILES} Anhänge. Bitte Dateien entfernen.`;
  }
  let total = 0;
  for (const file of files) {
    const label = displayBoardRundmailFileName(file.name);
    if (file.size <= 0) return `„${label}“ ist leer.`;
    if (!BOARD_RUNDMAIL_FILE_TYPES[extensionOf(file.name)]) {
      return `„${label}“ ist nicht erlaubt. Erlaubt sind PDF, Bilder und gängige Office-Dokumente.`;
    }
    total += file.size;
  }
  if (total > BOARD_RUNDMAIL_MAX_TOTAL_BYTES) {
    return "Die Anhänge sind zusammen größer als 3 MB. Bitte Dateien entfernen.";
  }
  return null;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += String.fromCharCode(bytes[start + i] ?? 0);
  return out;
}

function magicMatches(kind: FileKind, bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  if (kind === "pdf") return ascii(bytes, 0, 4) === "%PDF";
  if (kind === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (kind === "png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (kind === "gif") return ascii(bytes, 0, 4) === "GIF8";
  if (kind === "webp") return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
  if (kind === "ole") return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function inspectBoardRundmailFile(
  filename: string,
  bytes: Uint8Array,
): { filename: string; contentType: string } | { error: string } {
  const label = displayBoardRundmailFileName(filename);
  const spec = BOARD_RUNDMAIL_FILE_TYPES[extensionOf(filename)];
  if (!spec) {
    return {
      error: `„${label}“ ist nicht erlaubt. Erlaubt sind PDF, Bilder und gängige Office-Dokumente.`,
    };
  }
  if (bytes.byteLength <= 0) return { error: `„${label}“ ist leer.` };
  if (bytes.byteLength > BOARD_RUNDMAIL_MAX_TOTAL_BYTES) {
    return { error: "Die Anhänge sind zusammen größer als 3 MB. Bitte Dateien entfernen." };
  }
  if (!magicMatches(spec.kind, bytes)) {
    return { error: `„${label}“ wirkt nicht wie eine gültige Datei.` };
  }
  return { filename: emailAttachmentFilename(filename, 0), contentType: spec.mime };
}

function codePoint(code: number): string {
  if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

function decodeEntitiesOnce(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&colon;/gi, ":")
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => codePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec: string) => codePoint(Number.parseInt(dec, 10)));
}

function decodeHref(value: string): string {
  let out = value;
  for (let i = 0; i < 3; i++) {
    const next = decodeEntitiesOnce(out);
    if (next === out) break;
    out = next;
  }
  return out.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

/** http(s) oder mailto. Ohne Protokoll wird https ergänzt. */
export function normalizeBoardLinkUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/[\u0000-\u001F\u007F]/g, "");
  if (!trimmed || trimmed.length > 2000) return null;
  if (/[<>"']/.test(trimmed) || /\s/.test(trimmed)) return null;
  const withProto = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProto);
  } catch {
    return null;
  }
  const protocol = url.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:" && protocol !== "mailto:") return null;
  if (protocol === "mailto:") {
    if (!url.pathname.includes("@")) return null;
    return url.toString();
  }
  if (!url.hostname || url.username || url.password) return null;
  return url.toString();
}

function readHref(attrs: string): string | null {
  const match = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
  const raw = match?.[1] ?? match?.[2] ?? match?.[3];
  if (!raw) return null;
  const decoded = decodeHref(raw);
  if (/[<>"']/.test(decoded) || /\s/.test(decoded)) return null;
  return normalizeBoardLinkUrl(decoded);
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripDangerousBlocks(html: string): string {
  return html
    .replace(/\u0000/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<\s*(script|style|iframe|object|embed|svg|math|form|textarea|noscript|link|meta|base|title)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(
      /<\s*(script|style|iframe|object|embed|svg|math|form|textarea|noscript|link|meta|base|title)\b[^>]*>[\s\S]*$/gi,
      "",
    )
    .replace(
      /<\s*(script|style|iframe|object|embed|svg|math|form|textarea|noscript|link|meta|base|title)\b[^>]*\/?\s*>/gi,
      "",
    );
}

/** Erlaubt Fett, Kursiv, Absätze und echte http(s)/mailto-Links. Keine Skripte, keine Event-Handler. */
export function sanitizeBoardEmailHtml(input: string): string {
  const source = stripDangerousBlocks(input);
  let anchorOpen = false;
  const tagRe = /<\/?\s*([a-zA-Z][a-zA-Z0-9:-]*)\b([^<>]*)>/g;
  const cleaned = source.replace(tagRe, (full, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    const closing = /^<\s*\//.test(full);
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (tag === "br") return closing ? "" : "<br>";
    if (closing) {
      if (tag === "a") {
        if (!anchorOpen) return "";
        anchorOpen = false;
        return "</a>";
      }
      return `</${tag}>`;
    }
    if (tag === "a") {
      const href = readHref(rawAttrs ?? "");
      if (!href) {
        anchorOpen = false;
        return "";
      }
      anchorOpen = true;
      return `<a href="${escapeAttr(href)}" style="${EMAIL_LINK_STYLE}">`;
    }
    return `<${tag}>`;
  });
  return cleaned.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function decodeTextEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');
}

export function boardEmailHtmlToText(sanitizedHtml: string): string {
  const withLinks = sanitizedHtml.replace(
    /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href: string, label: string) => {
      const text = decodeTextEntities(label.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
      const url = decodeTextEntities(href);
      if (!text || text === url) return url;
      return `${text} (${url})`;
    },
  );
  const withBreaks = withLinks
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|ul|ol)>/gi, "\n");
  return decodeTextEntities(withBreaks.replace(/<[^>]+>/g, ""))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isBoardEmailBodyEmpty(html: string): boolean {
  return boardEmailHtmlToText(sanitizeBoardEmailHtml(html)).trim().length === 0;
}

export function decorateBoardEmailHtml(sanitizedHtml: string): string {
  return sanitizedHtml
    .replace(/<p>/gi, `<p style="${EMAIL_PARAGRAPH_STYLE}">`)
    .replace(/<div>/gi, `<div style="${EMAIL_PARAGRAPH_STYLE}">`);
}

function applyTokens(chunk: string, vorname: string, anrede: string): string {
  return chunk.replace(/\{\{\s*(vorname|first_name|anrede|salutation)\s*\}\}/gi, (_match, key: string) => {
    const token = key.toLowerCase();
    if (token === "vorname" || token === "first_name") return vorname;
    if (token === "anrede" || token === "salutation") return anrede;
    return _match;
  });
}

export function replaceBoardRundmailTokens(
  input: string,
  values: { vorname: string; anrede: string },
  mode: "html" | "text",
): string {
  const vorname = mode === "html" ? escapePlainTextForHtml(values.vorname) : values.vorname;
  const anrede = mode === "html" ? escapePlainTextForHtml(values.anrede) : values.anrede;
  if (mode === "text") return applyTokens(input, vorname, anrede);
  return input.replace(/(<[^>]*>)|([^<]+)/g, (match, tag: string | undefined, text: string | undefined) =>
    tag ? tag : applyTokens(text ?? match, vorname, anrede),
  );
}

function plainPerson(value: string, fallback: string): string {
  const cleaned = value.replace(/[\r\n]+/g, " ").trim();
  return cleaned || fallback;
}

export function composeBoardRundmailMessage(input: {
  subject: string;
  html: string;
  text: string;
  firstName: string;
  salutation: string;
  signatureHtml?: string;
  signatureText?: string;
}): { subject: string; text: string; html: string } {
  const firstName = plainPerson(input.firstName, "Fan");
  const salutation = plainPerson(input.salutation, `Liebe/r ${firstName}`);
  const values = { vorname: firstName, anrede: salutation };
  const decorated = decorateBoardEmailHtml(input.html);
  const htmlInner = replaceBoardRundmailTokens(decorated, values, "html");
  const signatureHtml = input.signatureHtml?.trim() ?? "";
  const withSignature = signatureHtml
    ? appendSignatureToEmailHtml(htmlInner, signatureHtml)
    : htmlInner;
  const textCore = replaceBoardRundmailTokens(input.text, values, "text");
  const signatureText = input.signatureText?.replace(/[\r\n]+$/g, "").trim() ?? "";
  const text = signatureText ? (textCore ? `${textCore}\n\n${signatureText}` : signatureText) : textCore;
  const subject = replaceBoardRundmailTokens(input.subject, values, "text")
    .replace(/[\r\n]+/g, " ")
    .trim();
  return {
    subject,
    text,
    html: wrapEmailDocument(withSignature),
  };
}
