import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyPostComment } from "@/lib/comments/notify-post-comment";
import { notifyCommentReply } from "@/lib/comments/notify-reply";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  parentCommentId: z.string().uuid(),
  postId: z.string().uuid(),
  replyPreview: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await req.json());

  const { data: parent } = await supabase
    .from("post_comments")
    .select("id,author_id,post_id")
    .eq("id", body.parentCommentId)
    .maybeSingle();
  if (!parent || parent.post_id !== body.postId) {
    return NextResponse.json({ error: "Kommentar nicht gefunden" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const [{ data: me }, { data: post }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name,last_name,email")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("posts")
      .select("title,author_id,status")
      .eq("id", body.postId)
      .maybeSingle(),
  ]);

  const replierName =
    me?.first_name && me?.last_name
      ? `${me.first_name} ${me.last_name}`
      : (me?.email ?? "Mitglied");

  const postTitle = post?.title ?? "Beitrag";
  const repliedAt = new Date().toISOString();
  const postApproved = post?.status === "approved";

  await notifyCommentReply({
    recipientUserId: parent.author_id,
    replierUserId: user.id,
    replierName,
    postId: body.postId,
    postTitle,
    replyPreview: body.replyPreview,
    repliedAt,
  });

  if (
    postApproved &&
    post?.author_id &&
    post.author_id !== user.id &&
    post.author_id !== parent.author_id
  ) {
    await notifyPostComment({
      recipientUserId: post.author_id,
      commenterUserId: user.id,
      commenterName: replierName,
      postId: body.postId,
      postTitle,
      commentPreview: body.replyPreview,
      commentedAt: repliedAt,
    });
  }

  return NextResponse.json({ ok: true });
}
