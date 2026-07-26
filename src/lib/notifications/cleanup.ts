import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Entfernt Benachrichtigungen, die auf eine gelöschte/entfernte Entität verweisen. */
export async function deleteNotificationsByMetadata(
  metadataKey: string,
  metadataValue: string,
) {
  const value = metadataValue.trim();
  if (!value) return;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("user_notifications")
    .delete()
    .filter(`metadata->>${metadataKey}`, "eq", value);

  if (error && !/user_notifications|does not exist/i.test(error.message)) {
    console.error(`[notifications] cleanup ${metadataKey}=${value}:`, error.message);
  }
}

export async function deleteNotificationsByMetadataMany(
  metadataKey: string,
  metadataValues: string[],
) {
  const unique = [...new Set(metadataValues.filter(Boolean))];
  await Promise.all(unique.map((v) => deleteNotificationsByMetadata(metadataKey, v)));
}
