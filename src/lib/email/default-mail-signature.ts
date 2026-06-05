import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CLUB_SIGNATURE_ID, loadMailSignature } from "@/lib/email/signatures";
import type { AdminSignatureMail } from "@/lib/email/admin-signature-mail";

const SETTINGS_KEY = "default_mail_signature_id";

/** System-E-Mails nutzen immer die allgemeine Fanclub-Signatur — keine persönlichen Admin-Signaturen. */
export async function getDefaultMailSignatureId(): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();

  const configured = data?.value?.trim();
  if (configured === CLUB_SIGNATURE_ID) return CLUB_SIGNATURE_ID;

  if (configured) {
    await admin.from("app_settings").upsert({
      key: SETTINGS_KEY,
      value: CLUB_SIGNATURE_ID,
    });
  }

  return CLUB_SIGNATURE_ID;
}

export async function setDefaultMailSignatureId(signatureId: string) {
  if (signatureId.trim() !== CLUB_SIGNATURE_ID) {
    throw new Error("Als Standard ist nur die allgemeine Fanclub-Signatur erlaubt.");
  }
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("app_settings").upsert({
    key: SETTINGS_KEY,
    value: CLUB_SIGNATURE_ID,
  });
  if (error) throw new Error(error.message);
}

export async function loadDefaultMailSignature(): Promise<AdminSignatureMail> {
  const id = await getDefaultMailSignatureId();
  return loadMailSignature(id);
}
