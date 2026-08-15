export type AppRegistrationStatus = "open" | "registered" | "deleted";

export const APP_REGISTRATION_STATUS_LABELS: Record<AppRegistrationStatus, string> = {
  open: "Offen",
  registered: "Registriert",
  deleted: "Gelöscht",
};

/** Auth user_metadata-Key: Club-Setup oder Passwort-Reset erfolgreich abgeschlossen. */
export const APP_PASSWORD_SET_AT_META = "app_password_set_at";

export function isAppRegistrationStatus(value: unknown): value is AppRegistrationStatus {
  return value === "open" || value === "registered" || value === "deleted";
}

/**
 * Status aus Profilspalten + resilienten Signalen (auch wenn Migration 144 fehlt).
 * Prefer: wer die App klar genutzt / eingerichtet hat → registered (Reset only).
 */
export function resolveAppRegistrationStatus(input: {
  status?: string | null;
  registeredAt?: string | null;
  lastSignInAt?: string | null;
  lastAppActiveAt?: string | null;
  /** user_metadata.app_password_set_at nach erfolgreichem Club-Setup/Reset */
  passwordSetAt?: string | null;
}): AppRegistrationStatus {
  if (input.status === "deleted") return "deleted";
  if (input.status === "registered" || input.registeredAt) return "registered";
  // Bereits in der App aktiv, eingeloggt oder Passwort über Club-Flow gesetzt
  if (input.lastAppActiveAt || input.lastSignInAt || input.passwordSetAt) {
    return "registered";
  }
  return "open";
}

/** True, wenn die Person die App klar schon eingerichtet/genutzt hat (kein Ersteinrichtungs-Flow). */
export function isAppRegistered(
  input: Parameters<typeof resolveAppRegistrationStatus>[0],
): boolean {
  return resolveAppRegistrationStatus(input) === "registered";
}

export type AccountAccessFlowKind = "password_reset" | "account_setup";

export function resolveAccountAccessFlowKind(
  input: Parameters<typeof resolveAppRegistrationStatus>[0],
): AccountAccessFlowKind {
  return isAppRegistered(input) ? "password_reset" : "account_setup";
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
