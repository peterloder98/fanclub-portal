export type StockBadge = "sold_out" | "low" | "available";

export function stockBadge(available: number): StockBadge {
  if (available <= 0) return "sold_out";
  if (available < 5) return "low";
  return "available";
}

export function stockBadgeLabel(available: number): string {
  const kind = stockBadge(available);
  if (kind === "sold_out") return "Ausverkauft";
  if (kind === "low") return "Nur noch wenige verfügbar";
  return `Noch ${available} verfügbar`;
}
