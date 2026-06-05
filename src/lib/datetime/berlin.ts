export const BERLIN_TZ = "Europe/Berlin";

/** Anzeige für Admins & Termine — immer deutsche Lokalzeit. */
export function formatBerlinDateTime(
  value: string | Date | null | undefined,
  opts?: { withSeconds?: boolean },
): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", {
    timeZone: BERLIN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: opts?.withSeconds ? "2-digit" : undefined,
  });
}
