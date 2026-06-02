import { getSupabaseEnv } from "@/lib/supabase/env";

export function postMediaPublicUrl(storagePath: string | null | undefined) {
  if (!storagePath) return null;
  const { url } = getSupabaseEnv();
  return `${url}/storage/v1/object/public/post-media/${storagePath}`;
}

