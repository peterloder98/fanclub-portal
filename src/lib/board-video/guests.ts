import type { BoardVideoExtraGuestInput } from "@/lib/board-video/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseExtraGuests(
  raw: Array<{ name?: string; email?: string }> | null | undefined,
): { ok: true; guests: BoardVideoExtraGuestInput[] } | { ok: false; error: string } {
  const guests: BoardVideoExtraGuestInput[] = [];
  const seen = new Set<string>();
  for (const row of raw ?? []) {
    const name = (row.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    const email = (row.email ?? "").trim().toLowerCase();
    if (!name && !email) continue;
    if (name.length < 2) {
      return { ok: false, error: "Gast-Name: mindestens 2 Zeichen." };
    }
    if (!EMAIL_RE.test(email)) {
      return { ok: false, error: `Ungültige Gast-E-Mail: ${email || "leer"}.` };
    }
    if (seen.has(email)) {
      return { ok: false, error: `E-Mail ${email} ist doppelt eingetragen.` };
    }
    seen.add(email);
    guests.push({ name, email });
  }
  return { ok: true, guests };
}

export function guestFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  return first || "Gast";
}
