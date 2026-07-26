import { captureFlyRect, flyPointsFromElement } from "@/lib/points/fly";
import { POINT_VALUES } from "@/lib/points/values";

/**
 * Punkte-Animation: +5 beim ersten Vote auf einer Umfrage.
 * −5 nur wenn keine Option dieser Umfrage mehr gewählt ist (Mehrfachauswahl: Teilabwahl = kein Minus).
 */
export function applyPollVotePointsFx(params: {
  votesBefore: number;
  votesAfter: number;
  fromEl?: HTMLElement | null;
  fromRect?: { left: number; top: number; width: number; height: number } | null;
}) {
  const { votesBefore, votesAfter, fromEl, fromRect } = params;
  const before = Math.max(0, votesBefore);
  const after = Math.max(0, votesAfter);
  const rect = fromRect ?? captureFlyRect(fromEl ?? null);

  if (before === 0 && after > 0) {
    flyPointsFromElement({ fromRect: rect, fromEl, delta: +POINT_VALUES.pollVote });
    return;
  }
  if (before > 0 && after === 0) {
    flyPointsFromElement({ fromRect: rect, fromEl, delta: -POINT_VALUES.pollVote });
  }
}
