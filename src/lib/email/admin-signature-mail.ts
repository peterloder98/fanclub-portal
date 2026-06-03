import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CLUB_SIGNATURE_ID, loadMailSignature } from "@/lib/email/signatures";

export type AdminSignatureMail = {
  text: string;
  htmlBlock: string;
  imageCid: string | null;
  imageBuffer: Buffer | null;
  contentType: string;
};

/** Erste passende Vorstands-Signatur (Fallback für ältere Mail-Flows). */
export async function loadAdminSignatureForMail(): Promise<AdminSignatureMail> {
  const admin = createSupabaseAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id,admin_signature_text,admin_signature_image_path")
    .in("role", ["admin", "anni"])
    .order("updated_at", { ascending: false });

  const withImage = (profiles ?? []).find((p) => p.admin_signature_image_path);
  const withText = (profiles ?? []).find((p) => p.admin_signature_text?.trim());
  const picked = withImage ?? withText;
  if (picked?.id) return loadMailSignature(picked.id);
  return loadMailSignature(CLUB_SIGNATURE_ID);
}
