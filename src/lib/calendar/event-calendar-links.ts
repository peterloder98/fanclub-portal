/** Links zum direkten Öffnen in gängigen Kalendern (ohne nur .ics-Download). */

export type EventCalendarPayload = {
  title: string;
  startAt: string;
  durationHours?: number;
  location?: string;
  description?: string;
};

function eventEndIso(startAt: string, durationHours = 3) {
  const end = new Date(startAt);
  end.setHours(end.getHours() + durationHours);
  return end.toISOString();
}

/** Google Calendar: YYYYMMDDTHHmmssZ */
function formatGoogleUtc(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

export function buildGoogleCalendarUrl(e: EventCalendarPayload): string | null {
  const start = formatGoogleUtc(e.startAt);
  const end = formatGoogleUtc(eventEndIso(e.startAt, e.durationHours));
  if (!start || !end) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${start}/${end}`,
  });
  if (e.location) params.set("location", e.location);
  if (e.description) params.set("details", e.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookWebUrl(e: EventCalendarPayload): string | null {
  const start = new Date(e.startAt);
  const end = new Date(eventEndIso(e.startAt, e.durationHours));
  if (Number.isNaN(start.getTime())) return null;
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
  });
  if (e.location) params.set("location", e.location);
  if (e.description) params.set("body", e.description);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** office365 outlook */
export function buildOutlookOfficeUrl(e: EventCalendarPayload): string | null {
  const url = buildOutlookWebUrl(e);
  if (!url) return null;
  return url.replace("outlook.live.com", "outlook.office.com");
}
