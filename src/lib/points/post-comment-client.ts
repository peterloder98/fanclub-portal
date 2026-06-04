import type { SupabaseClient } from "@supabase/supabase-js";

export type PostCommentPointsTxn = {
  id: string;
  points: number;
  created_at: string;
};

export function postCommentReason(isBirthday: boolean) {
  return isBirthday ? "birthday_comment" : "post_comment";
}

export async function fetchPostCommentPointsTxn(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  isBirthday: boolean,
): Promise<PostCommentPointsTxn | null> {
  const reason = postCommentReason(isBirthday);
  const { data, error } = await supabase
    .from("points_transactions")
    .select("id, points, created_at")
    .eq("user_id", userId)
    .eq("entity_type", "post")
    .eq("entity_id", postId)
    .eq("reason", reason)
    .maybeSingle();
  if (error) return null;
  return data;
}

/** Punkte, die nach Kommentar-Einfügen in der UI angezeigt werden sollen. */
export function deltaAfterCommentInsert(
  before: PostCommentPointsTxn | null,
  after: PostCommentPointsTxn | null,
): number {
  if (!after?.points || after.points <= 0) return 0;
  if (!before?.id) return after.points;
  if (before.id !== after.id) return after.points;
  const beforeMs = new Date(before.created_at).getTime();
  const afterMs = new Date(after.created_at).getTime();
  if (afterMs > beforeMs + 500) return after.points;
  return 0;
}

/** Punkte, die nach Kommentar-Löschen abgezogen werden sollen. */
export function deltaAfterCommentDelete(
  before: PostCommentPointsTxn | null,
  after: PostCommentPointsTxn | null,
): number {
  if (!before?.points || before.points <= 0) return 0;
  if (!after?.id) return -before.points;
  return 0;
}
