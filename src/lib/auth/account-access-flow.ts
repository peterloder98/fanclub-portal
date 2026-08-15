import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveAppRegistrationStatus } from "@/lib/membership/app-registration";
import { loadRegistrationProfileByUserId } from "@/lib/membership/load-registration-profile";

export type AccountAccessFlow = "password_reset" | "account_setup";

/**
 * Bereits registrierte Nutzer → nur Passwort-Reset.
 * Noch offene Zugänge → Ersteinrichtung (Geburtsdatum + Passwort).
 */
export async function getAccountAccessFlowForUser(
  userId: string,
): Promise<AccountAccessFlow> {
  const profile = await loadRegistrationProfileByUserId(userId);

  let lastSignInAt: string | null = null;
  try {
    const admin = createSupabaseAdminClient();
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    lastSignInAt = authUser.user?.last_sign_in_at ?? null;
  } catch {
    // ignore
  }

  const status = resolveAppRegistrationStatus({
    status: profile?.app_registration_status,
    registeredAt: profile?.app_registered_at,
    lastAppActiveAt: profile?.last_app_active_at,
    lastSignInAt,
  });
  return status === "registered" ? "password_reset" : "account_setup";
}
