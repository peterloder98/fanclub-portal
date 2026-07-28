import {
  buildEmailFromPlainText,
  resolveSignatureHtmlFromSource,
} from "@/lib/email/email-layout";

/** Plain-Text-E-Mail mit einheitlichem Layout (Karte auf hellem Hintergrund). */
export function buildHtmlFromPlain(
  text: string,
  signatureOrRenderedHtml?: string,
  signatureText?: string,
) {
  const signatureHtml = resolveSignatureHtmlFromSource(signatureOrRenderedHtml);
  return buildEmailFromPlainText(text, {
    signatureHtml,
    signatureText,
  });
}
