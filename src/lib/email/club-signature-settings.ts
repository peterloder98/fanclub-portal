import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CLUB_SIGNATURE_TEXT } from "@/lib/email/club-signature-defaults";

export { DEFAULT_CLUB_SIGNATURE_TEXT } from "@/lib/email/club-signature-defaults";

export const CLUB_SIGNATURE_TEXT_KEY = "club_signature_text";
export const CLUB_SIGNATURE_IMAGE_KEY = "club_signature_image_path";

export async function getClubSignatureText(): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", CLUB_SIGNATURE_TEXT_KEY)
    .maybeSingle();
  return data?.value?.trim() || DEFAULT_CLUB_SIGNATURE_TEXT;
}

export async function getClubSignatureImagePath(): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", CLUB_SIGNATURE_IMAGE_KEY)
    .maybeSingle();
  const v = data?.value?.trim();
  return v || null;
}

export async function setClubSignatureText(text: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("app_settings").upsert({
    key: CLUB_SIGNATURE_TEXT_KEY,
    value: text,
  });
  if (error) throw new Error(error.message);
}

export async function setClubSignatureImagePath(path: string | null) {
  const admin = createSupabaseAdminClient();
  if (!path) {
    await admin.from("app_settings").delete().eq("key", CLUB_SIGNATURE_IMAGE_KEY);
    return;
  }
  const { error } = await admin.from("app_settings").upsert({
    key: CLUB_SIGNATURE_IMAGE_KEY,
    value: path,
  });
  if (error) throw new Error(error.message);
}
