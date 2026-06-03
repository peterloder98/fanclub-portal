export function personenTeilgenommen(count: number): string {
  if (count === 1) return "1 Person hat teilgenommen";
  return `${count} Personen haben teilgenommen`;
}

export function personenNehmenTeil(count: number): string {
  if (count === 1) return "1 Person nimmt teil";
  return `${count} Personen nehmen teil`;
}

export function stimmenLabel(count: number): string {
  if (count === 1) return "1 Stimme";
  return `${count} Stimmen`;
}
