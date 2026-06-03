export function giveawayPhase(
  endsAt: string,
  status: string,
): "active" | "ended" | "drawn" {
  if (status === "drawn") return "drawn";
  const ended = new Date(endsAt).getTime() < Date.now();
  if (ended || status === "ended") return "ended";
  return "active";
}

export function giveawayPhaseLabel(phase: ReturnType<typeof giveawayPhase>): string {
  if (phase === "drawn") return "Ausgelost";
  if (phase === "ended") return "Beendet";
  return "Läuft";
}
