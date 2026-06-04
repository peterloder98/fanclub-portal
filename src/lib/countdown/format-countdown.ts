/** z. B. „12 Tage 23 Std. 5 Min. 59 Sek.“ */
export function formatCountdownVerbose(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = Math.floor(s % 60);

  const dayWord = days === 1 ? "Tag" : "Tage";
  return `${days} ${dayWord} ${hours} Std. ${minutes} Min. ${seconds} Sek.`;
}
