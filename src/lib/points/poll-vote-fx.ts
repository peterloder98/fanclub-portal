import { flyPointsFromElement } from "@/lib/points/fly";

/** Punkte-Animation nach Abstimmung: +5 beim ersten Vote, −5 wenn alle Stimmen zurückgenommen. */
export function applyPollVotePointsFx(params: {
  votesBefore: number;
  votesAfter: number;
  fromEl: HTMLElement;
}) {
  const { votesBefore, votesAfter, fromEl } = params;
  if (votesBefore === 0 && votesAfter > 0) {
    flyPointsFromElement({ fromEl, delta: +5 });
  } else if (votesBefore > 0 && votesAfter === 0) {
    flyPointsFromElement({ fromEl, delta: -5 });
  }
}
