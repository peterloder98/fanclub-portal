export type UpcomingBirthdayRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** Nächstes Vorkommen (ISO yyyy-mm-dd) */
  nextDateIso: string;
  /** z. B. „Sa., 15. März 2026“ */
  dateLabel: string;
};

function berlinTodayParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value ?? "2026");
  const m = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const d = Number(parts.find((p) => p.type === "day")?.value ?? "1");
  return { y, m, d };
}

function nextBirthdayIso(birthdate: string, today: { y: number; m: number; d: number }) {
  const md = String(birthdate).slice(5, 10);
  const [mm, dd] = md.split("-").map(Number);
  if (!mm || !dd) return null;
  let year = today.y;
  const candidate = new Date(year, mm - 1, dd);
  const todayStart = new Date(today.y, today.m - 1, today.d);
  if (candidate < todayStart) year += 1;
  const iso = `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  return iso;
}

const dateLabelFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function buildUpcomingBirthdays(
  profiles: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
    birthdate: string | null;
    avatarUrl: string | null;
    name: string;
  }>,
  limit = 10,
): UpcomingBirthdayRow[] {
  const today = berlinTodayParts();
  const rows: UpcomingBirthdayRow[] = [];

  for (const p of profiles) {
    if (!p.birthdate) continue;
    const nextIso = nextBirthdayIso(p.birthdate, today);
    if (!nextIso) continue;
    rows.push({
      userId: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl,
      nextDateIso: nextIso,
      dateLabel: dateLabelFmt.format(new Date(`${nextIso}T12:00:00`)),
    });
  }

  rows.sort((a, b) => a.nextDateIso.localeCompare(b.nextDateIso));
  return rows.slice(0, limit);
}
