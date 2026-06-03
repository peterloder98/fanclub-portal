export function giveawayPhase(
  endsAt: string,
  status: string,
  isPaused = false,
): "active" | "paused" | "ended" | "drawn" {
  if (status === "drawn") return "drawn";
  if (isPaused && status !== "ended") return "paused";
  const ended = new Date(endsAt).getTime() < Date.now();
  if (ended || status === "ended") return "ended";
  return "active";
}

export function giveawayPhaseLabel(phase: ReturnType<typeof giveawayPhase>): string {
  if (phase === "drawn") return "Ausgelost";
  if (phase === "ended") return "Beendet";
  if (phase === "paused") return "Pausiert";
  return "Läuft";
}
