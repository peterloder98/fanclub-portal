/** z. B. „am 06.06.2026 um 0:24 Uhr" — immer Europe/Berlin. */
import { formatBerlinNotificationDateTime } from "@/lib/datetime/berlin";

export function formatNotificationDateTime(iso: string): string {
  return formatBerlinNotificationDateTime(iso);
}
