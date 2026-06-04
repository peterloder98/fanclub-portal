export function pickNextEvent<T extends { start_at: string | null; title: string }>(
  events: T[],
): T | null {
  const now = Date.now();
  const withDate = events.filter(
    (e) => e.start_at && !Number.isNaN(new Date(e.start_at).getTime()),
  );

  const upcoming = withDate
    .filter((e) => new Date(e.start_at!).getTime() > now)
    .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime());

  return upcoming[0] ?? withDate[0] ?? null;
}
