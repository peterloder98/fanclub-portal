export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** ticket_url may be a link or plain info text from the feed. */
export function ticketDisplay(ticketUrl: string | null | undefined): {
  href: string | null;
  text: string | null;
} {
  const raw = (ticketUrl ?? "").trim();
  if (!raw) return { href: null, text: null };
  if (isHttpUrl(raw)) return { href: raw, text: null };
  return { href: null, text: raw };
}
