import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { POINT_VALUES } from "@/lib/points/values";
import { notifyRankUpIfChanged, sumUserPointsThisYear } from "@/lib/points/rank-notify";

export type PostCommentPointsResult = {
  ok: boolean;
  points: number;
  reason: "post_comment" | "birthday_comment";
  changed: boolean;
  error?: string;
};

export async function awardPostCommentPoints(
  userId: string,
  postId: string,
): Promise<PostCommentPointsResult> {
  const admin = createSupabaseAdminClient();

  const { data: comment } = await admin
    .from("post_comments")
    .select("id")
    .eq("post_id", postId)
    .eq("author_id", userId)
    .limit(1)
    .maybeSingle();
  if (!comment) {
    return {
      ok: false,
      points: 0,
      reason: "post_comment",
      changed: false,
      error: "no_comment",
    };
  }

  const { data: post } = await admin
    .from("posts")
    .select("is_birthday")
    .eq("id", postId)
    .maybeSingle();

  const isBirthday = Boolean(post?.is_birthday);
  const reason = isBirthday ? "birthday_comment" : "post_comment";
  const points = isBirthday ? POINT_VALUES.birthdayComment : POINT_VALUES.postComment;

  const { data: existing } = await admin
    .from("points_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("entity_type", "post")
    .eq("entity_id", postId)
    .eq("reason", reason)
    .maybeSingle();

  if (existing) {
    return { ok: true, points, reason, changed: false };
  }

  const pointsBefore = await sumUserPointsThisYear(userId);
  const { error } = await admin.from("points_transactions").insert({
    user_id: userId,
    points,
    reason,
    entity_type: "post",
    entity_id: postId,
  });

  if (error) {
    return { ok: false, points, reason, changed: false, error: error.message };
  }

  await notifyRankUpIfChanged(userId, pointsBefore, pointsBefore + points).catch(console.error);

  return { ok: true, points, reason, changed: true };
}

export async function revokePostCommentPoints(
  userId: string,
  postId: string,
): Promise<PostCommentPointsResult> {
  const admin = createSupabaseAdminClient();

  const { data: post } = await admin
    .from("posts")
    .select("is_birthday")
    .eq("id", postId)
    .maybeSingle();

  const isBirthday = Boolean(post?.is_birthday);
  const reason = isBirthday ? "birthday_comment" : "post_comment";
  const points = isBirthday ? POINT_VALUES.birthdayComment : POINT_VALUES.postComment;

  const { data: deleted, error } = await admin
    .from("points_transactions")
    .delete()
    .eq("user_id", userId)
    .eq("entity_type", "post")
    .eq("entity_id", postId)
    .eq("reason", reason)
    .select("id");

  if (error) {
    return { ok: false, points, reason, changed: false, error: error.message };
  }

  return { ok: true, points, reason, changed: (deleted?.length ?? 0) > 0 };
}
