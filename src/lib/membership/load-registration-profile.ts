import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RegistrationProfileFields = {
  app_registration_status?: string | null;
  app_registered_at?: string | null;
  last_app_active_at?: string | null;
};

const MISSING_REG_COLS =
  /app_registration_status|app_registered_at|does not exist/i;

/**
 * Lädt Registrierungsfelder; fällt zurück, wenn Migration 144 noch fehlt.
 * Ohne Fallback würde z. B. „Passwort vergessen“ still „Erfolg“ vortäuschen.
 */
export async function loadRegistrationProfileByUserId(
  userId: string,
): Promise<RegistrationProfileFields | null> {
  const admin = createSupabaseAdminClient();
  const full = await admin
    .from("profiles")
    .select("app_registration_status,app_registered_at,last_app_active_at")
    .eq("id", userId)
    .maybeSingle();

  if (!full.error) return full.data;

  if (!MISSING_REG_COLS.test(full.error.message)) {
    console.error("[registration-profile]", full.error.message);
    return null;
  }

  const fallback = await admin
    .from("profiles")
    .select("last_app_active_at")
    .eq("id", userId)
    .maybeSingle();
  if (fallback.error) {
    console.error("[registration-profile] fallback:", fallback.error.message);
    return null;
  }
  return fallback.data;
}

export type ForgotPasswordProfile = {
  id: string;
  email: string;
  first_name: string | null;
  gender: string | null;
  app_registration_status?: string | null;
  app_registered_at?: string | null;
  last_app_active_at?: string | null;
};

export async function loadForgotPasswordProfileByEmail(
  email: string,
): Promise<ForgotPasswordProfile | null> {
  const admin = createSupabaseAdminClient();
  const normalized = email.trim().toLowerCase();

  const full = await admin
    .from("profiles")
    .select(
      "id,email,first_name,gender,app_registration_status,app_registered_at,last_app_active_at",
    )
    .ilike("email", normalized)
    .maybeSingle();

  if (!full.error) {
    return full.data as ForgotPasswordProfile | null;
  }

  if (!MISSING_REG_COLS.test(full.error.message)) {
    console.error("[forgot-password] profile:", full.error.message);
    return null;
  }

  const fallback = await admin
    .from("profiles")
    .select("id,email,first_name,gender,last_app_active_at")
    .ilike("email", normalized)
    .maybeSingle();

  if (fallback.error) {
    console.error("[forgot-password] profile fallback:", fallback.error.message);
    return null;
  }
  return fallback.data as ForgotPasswordProfile | null;
}
