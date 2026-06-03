export function buildHtmlFromPlain(text: string, templateHtml: string) {
  const body = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  const sigMatch = templateHtml.match(/<p style="margin-top:1\.25rem[\s\S]*$/i);
  const sigBlock = sigMatch ? sigMatch[0] : "";
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:24px"><div style="max-width:560px">${body}${sigBlock}</div></body></html>`;
}
