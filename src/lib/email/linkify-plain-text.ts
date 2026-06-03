/** URLs in bereits HTML-escapedem Text als klickbare Links markieren. */
const URL_RE =
  /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]"'»„“])/gi;

export function linkifyEscapedHtml(text: string): string {
  return text.replace(URL_RE, (url) => {
    const href = url.replace(/&amp;/g, "&");
    return `<a href="${href}" style="color:#2563eb;text-decoration:underline">${url}</a>`;
  });
}

export function escapePlainTextForHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function plainTextToHtmlBody(text: string): string {
  const escaped = escapePlainTextForHtml(text);
  return linkifyEscapedHtml(escaped.replace(/\n/g, "<br>"));
}
