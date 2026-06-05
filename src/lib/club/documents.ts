import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CLUB_DOCUMENTS_BUCKET } from "@/lib/images/specs";

export async function signedClubDocumentUrl(
  storagePath: string | null | undefined,
  expiresSec = 3600,
): Promise<string | null> {
  if (!storagePath) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(CLUB_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
