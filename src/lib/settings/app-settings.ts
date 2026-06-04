import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getAppSetting(key: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? null;
}

export async function setAppSetting(key: string, value: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("app_settings").upsert({ key, value });
  if (error) throw new Error(error.message);
}

export async function getAppSettingBool(key: string, defaultValue = false): Promise<boolean> {
  const raw = await getAppSetting(key);
  if (raw === null || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}

export const NOTIFY_MEMBERS_NEW_GIVEAWAY_KEY = "notify_members_new_giveaway";
export const NOTIFY_MEMBERS_NEW_POLL_KEY = "notify_members_new_poll";
