import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyPostComment } from "@/lib/comments/notify-post-comment";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  postId: z.string().uuid(),
  commentPreview: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await req.json());

  const [{ data: post }, { data: me }] = await Promise.all([
    supabase
      .from("posts")
      .select("id,title,author_id")
      .eq("id", body.postId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("first_name,last_name,email")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!post?.author_id) {
    return NextResponse.json({ error: "Beitrag nicht gefunden" }, { status: 404 });
  }

  const commenterName =
    me?.first_name && me?.last_name
      ? `${me.first_name} ${me.last_name}`
      : (me?.email ?? "Mitglied");

  await notifyPostComment({
    recipientUserId: post.author_id,
    commenterUserId: user.id,
    commenterName,
    postId: body.postId,
    postTitle: post.title ?? "Beitrag",
    commentPreview: body.commentPreview,
    commentedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
