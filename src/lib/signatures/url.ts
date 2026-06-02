import { getSupabaseEnv } from "@/lib/supabase/env";

/** Public URL if bucket `signatures` is public; otherwise use `/api/signature/image`. */
export function signatureStoragePublicUrl(path: string | null | undefined) {
  if (!path) return null;
  const { url } = getSupabaseEnv();
  return `${url}/storage/v1/object/public/signatures/${path}`;
}
