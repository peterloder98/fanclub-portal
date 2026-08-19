import type { SupabaseClient } from "@supabase/supabase-js";

type PostMediaAccessResult =
  | { ok: true; isAdmin: boolean }
  | { ok: false; error: string; status: number };

export async function assertPostMediaAccess(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  options?: { requireAdmin?: boolean },
): Promise<PostMediaAccessResult> {
  const { data: post } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return { ok: false, error: "post_not_found", status: 404 };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const isAdmin = me?.role === "admin";

  if (options?.requireAdmin && !isAdmin) {
    return {
      ok: false,
      error: "Videos können nur von Admins gepostet werden.",
      status: 403,
    };
  }

  if (!isAdmin && post.author_id !== userId) {
    return { ok: false, error: "forbidden", status: 403 };
  }

  return { ok: true, isAdmin };
}

export function isValidPostMediaRawPath(rawPath: string, postId: string, userId: string) {
  const prefix = `${postId}/${userId}/raw_`;
  return rawPath.startsWith(prefix) && rawPath.endsWith(".mp4") && !rawPath.includes("..");
}
