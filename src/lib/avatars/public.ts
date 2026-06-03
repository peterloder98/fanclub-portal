import { getSupabaseEnv } from "@/lib/supabase/env";

export function avatarPublicUrl(
  avatarPath: string | null | undefined,
  version?: string | null,
) {
  if (!avatarPath) return null;
  const { url } = getSupabaseEnv();
  const base = `${url}/storage/v1/object/public/avatars/${avatarPath}`;
  if (!version) return base;
  return `${base}?v=${encodeURIComponent(version)}`;
}

