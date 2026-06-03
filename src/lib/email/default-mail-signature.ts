import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CLUB_SIGNATURE_ID, listMailSignatureOptions, loadMailSignature } from "@/lib/email/signatures";
import type { AdminSignatureMail } from "@/lib/email/admin-signature-mail";

const SETTINGS_KEY = "default_mail_signature_id";

export async function getDefaultMailSignatureId(): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();

  const configured = data?.value?.trim();
  if (configured) return configured;

  const options = await listMailSignatureOptions();
  if (options.length === 1) return options[0]!.id;
  return CLUB_SIGNATURE_ID;
}

export async function setDefaultMailSignatureId(signatureId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("app_settings").upsert({
    key: SETTINGS_KEY,
    value: signatureId,
  });
  if (error) throw new Error(error.message);
}

export async function loadDefaultMailSignature(): Promise<AdminSignatureMail> {
  const id = await getDefaultMailSignatureId();
  return loadMailSignature(id);
}
