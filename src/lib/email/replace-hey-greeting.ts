/** Ersetzt den Namen in der ersten Zeile „Hey …,“ (live beim Tippen). */

export function replaceHeyRecipient(body: string, previous: string, next: string) {
  const prev = previous.trim() || "du";
  const nxt = next.trim() || "du";
  if (prev === nxt) return body;

  const lines = body.split("\n");
  if (!lines[0]?.startsWith("Hey ")) return body;

  const match = lines[0].match(/^Hey (.+?)(,.*)?$/);
  if (match) {
    lines[0] = `Hey ${nxt}${match[2] ?? ","}`;
    return lines.join("\n");
  }

  lines[0] = `Hey ${nxt},`;
  return lines.join("\n");
}
