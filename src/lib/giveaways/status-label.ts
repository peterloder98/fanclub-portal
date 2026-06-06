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

/** Gewinnspiel nicht mehr aktiv (beendet, pausiert oder ausgelost) — z. B. Quiz-Antworten einklappen. */
export function isGiveawayOver(
  endsAt: string,
  status: string,
  isPaused = false,
): boolean {
  return giveawayPhase(endsAt, status, isPaused) !== "active";
}

export function canAdminDrawGiveaway(
  endsAt: string,
  status: string,
): boolean {
  if (status === "drawn") return false;
  const ended = new Date(endsAt).getTime() < Date.now();
  return ended || status === "ended";
}

export function giveawayPhaseLabel(phase: ReturnType<typeof giveawayPhase>): string {
  if (phase === "drawn") return "Ausgelost";
  if (phase === "ended") return "Beendet";
  if (phase === "paused") return "Pausiert";
  return "Läuft";
}

/** Hinweis nach Ablauf: Auslosungsstatus für Admins und Mitglieder. */
export function giveawayDrawStatusLabel(
  endsAt: string,
  status: string,
  isPaused = false,
): "not_drawn" | "drawn" | null {
  const phase = giveawayPhase(endsAt, status, isPaused);
  if (phase === "drawn") return "drawn";
  if (phase === "ended") return "not_drawn";
  return null;
}
