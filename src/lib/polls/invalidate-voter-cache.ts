import type { Dispatch, SetStateAction } from "react";

/** Entfernt gecachte Voter-Listen nach Stimmänderung (Hover zeigt sonst veraltete Daten). */
export function invalidatePollVoterCache<T>(
  setCache: Dispatch<SetStateAction<Record<string, T[]>>>,
  optionIds: string[],
) {
  if (!optionIds.length) return;
  setCache((m) => {
    const next = { ...m };
    for (const id of optionIds) delete next[id];
    return next;
  });
}
