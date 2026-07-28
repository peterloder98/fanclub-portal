import { escapePlainTextForHtml, linkifyEscapedHtml } from "@/lib/email/linkify-plain-text";

/** Gemeinsames Erscheinungsbild (wie App-Zugang / Vorlagen-E-Mails). */
export const EMAIL_PARAGRAPH_STYLE =
  "margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b";

export const EMAIL_LINK_STYLE = "color:#2563eb;text-decoration:underline";

export const EMAIL_BUTTON_STYLE =
  "display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600";

export function emailPrimaryButton(href: string, label: string) {
  const safeHref = escapePlainTextForHtml(href);
  const safeLabel = escapePlainTextForHtml(label);
  return `<a href="${safeHref}" style="${EMAIL_BUTTON_STYLE}">${safeLabel}</a>`;
}

export function wrapEmailDocument(innerHtml: string) {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;padding:24px;background:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0">${innerHtml}</div></body></html>`;
}

export function appendSignatureToEmailHtml(bodyHtml: string, signatureHtml: string) {
  const core = bodyHtml.trimEnd();
  const sig = signatureHtml.trim();
  if (!sig) return core;
  if (!core) return sig;
  return `${core}<p style="margin:0 0 1em;line-height:1.5">&nbsp;</p>${sig}`;
}

export function stripPlainSignatureSuffix(body: string, signatureText: string) {
  const sig = signatureText.trim();
  if (!sig) return body.trimEnd();
  const trimmed = body.trimEnd();
  if (trimmed.endsWith(sig)) {
    return trimmed.slice(0, -sig.length).replace(/\n{1,2}$/, "").trimEnd();
  }
  return trimmed;
}

function applyMarkdownLite(escaped: string) {
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function paragraphInnerFromPlain(block: string, markdown: boolean) {
  const escaped = escapePlainTextForHtml(block);
  const withMd = markdown ? applyMarkdownLite(escaped) : escaped;
  const withBreaks = withMd.replace(/\n/g, "<br>");
  return linkifyEscapedHtml(withBreaks);
}

export function plainTextToEmailParagraphs(text: string, opts?: { markdown?: boolean }) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const blocks = trimmed.split(/\n\n+/).filter(Boolean);
  return blocks
    .map((p) => {
      const inner = paragraphInnerFromPlain(p, opts?.markdown ?? false);
      return `<p style="${EMAIL_PARAGRAPH_STYLE}">${inner}</p>`;
    })
    .join("");
}

export type BuildEmailFromPlainTextOptions = {
  signatureHtml?: string;
  signatureText?: string;
  markdown?: boolean;
};

export function buildEmailFromPlainText(
  text: string,
  options?: BuildEmailFromPlainTextOptions,
) {
  let bodyText = text;
  if (options?.signatureHtml && options?.signatureText) {
    bodyText = stripPlainSignatureSuffix(text, options.signatureText);
  }
  let bodyHtml = plainTextToEmailParagraphs(bodyText, { markdown: options?.markdown });
  if (options?.signatureHtml) {
    bodyHtml = appendSignatureToEmailHtml(bodyHtml, options.signatureHtml);
  }
  return wrapEmailDocument(bodyHtml);
}

/** Signatur aus vollständig gerenderter Vorlagen-E-Mail oder Signatur-HTML-Block. */
export function resolveSignatureHtmlFromSource(source?: string): string | undefined {
  if (!source?.trim()) return undefined;
  const input = source.trim();
  if (/cid:(club-signature|admin-signature)/i.test(input)) return input;
  const legacy = input.match(/<p style="margin-top:1\.25rem[\s\S]*$/i);
  if (legacy) return legacy[0];
  if (!input.includes("<!DOCTYPE")) return input;
  const fromRendered = input.match(
    /<p style="margin:0 0 1em;line-height:1\.5">&nbsp;<\/p>\s*([\s\S]+?)\s*<\/div>\s*<\/body>/i,
  );
  return fromRendered?.[1]?.trim() || undefined;
}
