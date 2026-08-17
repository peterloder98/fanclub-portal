import type { SupabaseClient } from "@supabase/supabase-js";
import { isRealMemberEmail } from "@/lib/email/is-real-member-email";

export type PaymentMailProfile = {
  email?: string | null;
  billing_email?: string | null;
  no_app_access?: boolean | null;
};

export function generateNoAppAuthEmail(): string {
  return `noapp-${crypto.randomUUID()}@fanclub-import.invalid`;
}

export function isNoAppPlaceholderEmail(email: string | null | undefined): boolean {
  const e = email?.trim().toLowerCase() ?? "";
  if (!e) return true;
  return e.includes("fanclub-import.invalid") || /noemail/i.test(e);
}

/** Beitrags-/Zahlungserinnerungen — auch an eine fremde Adresse (z. B. Mutter). */
export function resolvePaymentEmail(profile: PaymentMailProfile): string | null {
  const billing = profile.billing_email?.trim().toLowerCase() ?? "";
  if (isRealMemberEmail(billing)) return billing;
  const login = profile.email?.trim().toLowerCase() ?? "";
  if (isRealMemberEmail(login)) return login;
  return null;
}

/** Gewinnspiele, Events, App-Erinnerungen, Setup — nicht an reines Zahlungskonto. */
export function receivesCommunityEmails(profile: PaymentMailProfile): boolean {
  if (profile.no_app_access) return false;
  return isRealMemberEmail(profile.email);
}

/** Anzeige in der Vorstands-Liste/Datensatz — nie den Platzhalter-Login. */
export function adminVisibleEmail(profile: PaymentMailProfile): string | null {
  if (profile.no_app_access || isNoAppPlaceholderEmail(profile.email)) {
    const billing = profile.billing_email?.trim() || "";
    return billing || null;
  }
  return profile.email?.trim() || null;
}

export const PAYMENT_PROFILE_COLUMNS =
  "id,first_name,last_name,email,gender,membership_number,billing_email,no_app_access";

export async function loadPaymentMailProfile(
  admin: SupabaseClient,
  userId: string,
): Promise<{
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  gender: string | null;
  membership_number: string | null;
  billing_email: string | null;
  no_app_access: boolean;
} | null> {
  const full = await admin
    .from("profiles")
    .select(PAYMENT_PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (!full.error) {
    const row = full.data;
    if (!row) return null;
    return {
      ...row,
      no_app_access: Boolean(row.no_app_access),
      billing_email: row.billing_email ?? null,
    };
  }
  if (!/billing_email|no_app_access|does not exist/i.test(full.error.message)) {
    throw new Error(full.error.message);
  }
  const fb = await admin
    .from("profiles")
    .select("id,first_name,last_name,email,gender,membership_number")
    .eq("id", userId)
    .maybeSingle();
  if (fb.error) throw new Error(fb.error.message);
  if (!fb.data) return null;
  return { ...fb.data, billing_email: null, no_app_access: false };
}
