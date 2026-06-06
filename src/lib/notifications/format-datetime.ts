/** z. B. „am 06.06.2026 um 0:24 Uhr" */
export function formatNotificationDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const date = d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");

  return `am ${date} um ${hours}:${minutes} Uhr`;
}
