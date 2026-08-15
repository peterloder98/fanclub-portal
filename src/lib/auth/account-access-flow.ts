import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  APP_PASSWORD_SET_AT_META,
  resolveAppRegistrationStatus,
  resolveAccountAccessFlowKind,
  type AppRegistrationStatus,
} from "@/lib/membership/app-registration";
import { loadRegistrationProfileByUserId } from "@/lib/membership/load-registration-profile";

export type AccountAccessFlow = "password_reset" | "account_setup";

export type AccountAccessSignals = {
  status?: string | null;
  registeredAt?: string | null;
  lastAppActiveAt?: string | null;
  lastSignInAt?: string | null;
  passwordSetAt?: string | null;
};

/** Auth-Signale für die Registrierungserkennung (ohne Profil-Query). */
export async function loadAuthRegistrationSignals(
  userId: string,
): Promise<Pick<AccountAccessSignals, "lastSignInAt" | "passwordSetAt">> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const meta = authUser.user?.user_metadata as Record<string, unknown> | undefined;
    const passwordSetAt =
      typeof meta?.[APP_PASSWORD_SET_AT_META] === "string"
        ? (meta[APP_PASSWORD_SET_AT_META] as string)
        : null;
    return {
      lastSignInAt: authUser.user?.last_sign_in_at ?? null,
      passwordSetAt,
    };
  } catch {
    return { lastSignInAt: null, passwordSetAt: null };
  }
}

export async function loadAccountAccessSignals(
  userId: string,
): Promise<AccountAccessSignals> {
  const profile = await loadRegistrationProfileByUserId(userId);
  const auth = await loadAuthRegistrationSignals(userId);
  return {
    status: profile?.app_registration_status,
    registeredAt: profile?.app_registered_at,
    lastAppActiveAt: profile?.last_app_active_at,
    lastSignInAt: auth.lastSignInAt,
    passwordSetAt: auth.passwordSetAt,
  };
}

export function resolveAccountAccessFlowFromSignals(
  signals: AccountAccessSignals,
): AccountAccessFlow {
  return resolveAccountAccessFlowKind(signals);
}

/**
 * Bereits registrierte Nutzer → nur Passwort-Reset.
 * Noch offene Zugänge → Ersteinrichtung (Geburtsdatum + Passwort).
 * Funktioniert mit und ohne profiles.app_registration_* Spalten.
 */
export async function getAccountAccessFlowForUser(
  userId: string,
): Promise<AccountAccessFlow> {
  const signals = await loadAccountAccessSignals(userId);
  return resolveAccountAccessFlowFromSignals(signals);
}

export async function getAppRegistrationStatusForUser(
  userId: string,
): Promise<AppRegistrationStatus> {
  const signals = await loadAccountAccessSignals(userId);
  return resolveAppRegistrationStatus(signals);
}

/**
 * Nach erfolgreichem Club-Setup oder Passwort-Reset:
 * Auth-Metadata + Profilstatus (falls Spalten existieren).
 */
export async function markAppAccessRegistered(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  let existingMeta: Record<string, unknown> = {};
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    if (data.user?.user_metadata && typeof data.user.user_metadata === "object") {
      existingMeta = data.user.user_metadata as Record<string, unknown>;
    }
  } catch {
    // ignore — Metadata trotzdem setzen
  }

  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existingMeta,
      [APP_PASSWORD_SET_AT_META]: nowIso,
    },
  });
  if (authErr) {
    console.error("[account-access] password-set metadata:", authErr.message);
  }

  const { error: regErr } = await admin
    .from("profiles")
    .update({
      app_registration_status: "registered",
      app_registered_at: nowIso,
      app_registration_deleted_at: null,
    })
    .eq("id", userId);
  if (regErr && !/app_registration_status|does not exist/i.test(regErr.message)) {
    console.error("[account-access] Registrierungsstatus:", regErr.message);
  }
}
