export type GiveawayEntryRow = {
  user_id: string;
  is_eligible: boolean;
};

export type GiveawayPrizeRow = {
  id: string;
  sort_order: number;
};

/** Gleichverteilt in [0, max) — kryptografisch, nicht Math.random. */
export function secureRandomIndex(max: number): number {
  if (max <= 0) throw new Error("secureRandomIndex: max muss > 0 sein.");
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    // Rejection sampling vermeidet Modulo-Bias bei großen max.
    const limit = Math.floor(0x100000000 / max) * max;
    let x = 0;
    do {
      crypto.getRandomValues(buf);
      x = buf[0]!;
    } while (x >= limit);
    return x % max;
  }
  return Math.floor(Math.random() * max);
}

/** Ein Gewinner pro Preis; jede Person max. einmal pro Gewinnspiel. */
export function pickGiveawayWinners(
  prizes: GiveawayPrizeRow[],
  entries: GiveawayEntryRow[],
  randomIndex: (max: number) => number = secureRandomIndex,
): Array<{ prize_id: string; user_id: string }> {
  const eligible = entries.filter((e) => e.is_eligible);
  const pool = [...eligible];
  const winners: Array<{ prize_id: string; user_id: string }> = [];
  const used = new Set<string>();

  const sortedPrizes = [...prizes].sort((a, b) => a.sort_order - b.sort_order);

  for (const prize of sortedPrizes) {
    const available = pool.filter((e) => !used.has(e.user_id));
    if (!available.length) break;
    const idx = randomIndex(available.length);
    const picked = available[idx]!;
    winners.push({ prize_id: prize.id, user_id: picked.user_id });
    used.add(picked.user_id);
  }

  return winners;
}
