import { plainTextToHtmlBody } from "@/lib/email/linkify-plain-text";

export function buildHtmlFromPlain(text: string, templateHtml: string) {
  const body = plainTextToHtmlBody(text);
  const sigMatch = templateHtml.match(/<p style="margin-top:1\.25rem[\s\S]*$/i);
  const sigBlock = sigMatch ? sigMatch[0] : "";
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:24px"><div style="max-width:560px">${body}${sigBlock}</div></body></html>`;
}
