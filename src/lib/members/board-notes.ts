import type { SupabaseClient } from "@supabase/supabase-js";

export const MEMBER_BOARD_NOTE_MAX = 2000;

const TABLE_MISSING = /member_board_notes|does not exist/i;

export async function loadMemberBoardNote(
  admin: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await admin
    .from("member_board_notes")
    .select("note")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (TABLE_MISSING.test(error.message)) return "";
    throw error;
  }
  return (data?.note ?? "").trim();
}

export async function loadMemberBoardNotesMap(
  admin: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!userIds.length) return map;
  const { data, error } = await admin
    .from("member_board_notes")
    .select("user_id,note")
    .in("user_id", userIds);
  if (error) {
    if (TABLE_MISSING.test(error.message)) return map;
    throw error;
  }
  for (const row of data ?? []) {
    const note = (row.note ?? "").trim();
    if (note) map.set(row.user_id, note);
  }
  return map;
}
