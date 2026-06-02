import { getSupabaseEnv } from "@/lib/supabase/env";

export function avatarPublicUrl(avatarPath: string | null | undefined) {
  if (!avatarPath) return null;
  const { url } = getSupabaseEnv();
  return `${url}/storage/v1/object/public/avatars/${avatarPath}`;
}

