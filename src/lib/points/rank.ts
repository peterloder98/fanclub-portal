export function rankFromPoints(points: number) {
  if (points >= 700) return "Diamond-Fan";
  if (points >= 450) return "Gold-Fan";
  if (points >= 250) return "Silber-Fan";
  if (points >= 120) return "Bronze-Fan";
  if (points >= 50) return "Aktiv-Fan";
  return "Fan";
}

