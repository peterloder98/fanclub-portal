/** Minimal iCalendar (.ics) für „In Kalender speichern“. */

function escapeIcs(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsUtc(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

export function buildEventIcs(params: {
  title: string;
  startAt: string;
  durationHours?: number;
  location?: string;
  description?: string;
  uid?: string;
}) {
  const start = formatIcsUtc(params.startAt);
  if (!start) throw new Error("Ungültiges Datum");

  const endDate = new Date(params.startAt);
  endDate.setHours(endDate.getHours() + (params.durationHours ?? 3));
  const end = formatIcsUtc(endDate.toISOString())!;

  const uid = params.uid ?? `event-${start}-${Math.random().toString(36).slice(2)}@anni-perka-fanclub`;
  const now = formatIcsUtc(new Date().toISOString())!;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Anni Perka Fanclub//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(params.title)}`,
  ];
  if (params.location) lines.push(`LOCATION:${escapeIcs(params.location)}`);
  if (params.description) lines.push(`DESCRIPTION:${escapeIcs(params.description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcsFile(ics: string, filename: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
