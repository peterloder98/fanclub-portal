/**
 * Artistflow dateLabel formats:
 * - "26.07.2026"
 * - "08.10. - 11.10.2026" (year only on end)
 * - "08.10.2026 - 11.10.2026"
 */
export function parseArtistflowDateLabel(dateLabel: string | null | undefined): {
  startDate: string | null;
  endDate: string | null;
} {
  const raw = (dateLabel ?? "").trim();
  if (!raw) return { startDate: null, endDate: null };

  const range = raw.match(
    /^(\d{2})\.(\d{2})\.(?:(\d{4}))?\s*[-–—]\s*(\d{2})\.(\d{2})\.(\d{4})$/,
  );
  if (range) {
    const d1 = Number(range[1]);
    const m1 = Number(range[2]);
    const y2 = Number(range[6]);
    const d2 = Number(range[4]);
    const m2 = Number(range[5]);
    let y1 = range[3] ? Number(range[3]) : y2;
    if (!range[3] && m1 > m2) y1 = y2 - 1;
    return {
      startDate: toIsoDate(y1, m1, d1),
      endDate: toIsoDate(y2, m2, d2),
    };
  }

  const single = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (single) {
    const iso = toIsoDate(Number(single[3]), Number(single[2]), Number(single[1]));
    return { startDate: iso, endDate: null };
  }

  return { startDate: null, endDate: null };
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) {
    return null;
  }
  return iso;
}

/** Midnight UTC ISO for date-only Artistflow values. */
export function dateOnlyToStartAt(isoDate: string | null): string | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  return `${isoDate}T00:00:00.000Z`;
}
