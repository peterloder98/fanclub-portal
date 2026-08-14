export type AppRegistrationStatus = "open" | "registered" | "deleted";

export const APP_REGISTRATION_STATUS_LABELS: Record<AppRegistrationStatus, string> = {
  open: "Offen",
  registered: "Registriert",
  deleted: "Gelöscht",
};

export function isAppRegistrationStatus(value: unknown): value is AppRegistrationStatus {
  return value === "open" || value === "registered" || value === "deleted";
}

/** Status aus Profilspalte (+ App-Aktivität / Login als Hinweis vor/ohne Backfill). */
export function resolveAppRegistrationStatus(input: {
  status?: string | null;
  registeredAt?: string | null;
  lastSignInAt?: string | null;
  lastAppActiveAt?: string | null;
}): AppRegistrationStatus {
  if (input.status === "deleted") return "deleted";
  if (input.status === "registered" || input.registeredAt) return "registered";
  // Bereits in der App aktiv oder eingeloggt, Spalte noch „open“ (vor Backfill)
  if (input.lastAppActiveAt || input.lastSignInAt) return "registered";
  return "open";
}

export function appRegistrationBadgeClass(status: AppRegistrationStatus): string {
  switch (status) {
    case "registered":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "deleted":
      return "border-slate-300 bg-slate-100 text-slate-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-950";
  }
}
