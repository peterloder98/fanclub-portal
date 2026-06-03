export type GiveawayEntryRow = {
  user_id: string;
  is_eligible: boolean;
};

export type GiveawayPrizeRow = {
  id: string;
  sort_order: number;
};

/** Ein Gewinner pro Preis; jede Person max. einmal pro Gewinnspiel. */
export function pickGiveawayWinners(
  prizes: GiveawayPrizeRow[],
  entries: GiveawayEntryRow[],
): Array<{ prize_id: string; user_id: string }> {
  const eligible = entries.filter((e) => e.is_eligible);
  const pool = [...eligible];
  const winners: Array<{ prize_id: string; user_id: string }> = [];
  const used = new Set<string>();

  const sortedPrizes = [...prizes].sort((a, b) => a.sort_order - b.sort_order);

  for (const prize of sortedPrizes) {
    const available = pool.filter((e) => !used.has(e.user_id));
    if (!available.length) break;
    const idx = Math.floor(Math.random() * available.length);
    const picked = available[idx]!;
    winners.push({ prize_id: prize.id, user_id: picked.user_id });
    used.add(picked.user_id);
  }

  return winners;
}
