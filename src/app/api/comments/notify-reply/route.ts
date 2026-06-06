import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyCommentReply } from "@/lib/comments/notify-reply";
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

  const [{ data: me }, { data: post }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name,last_name,email")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("posts").select("title").eq("id", body.postId).maybeSingle(),
  ]);

  const replierName =
    me?.first_name && me?.last_name
      ? `${me.first_name} ${me.last_name}`
      : (me?.email ?? "Mitglied");

  await notifyCommentReply({
    recipientUserId: parent.author_id,
    replierUserId: user.id,
    replierName,
    postId: body.postId,
    postTitle: post?.title ?? "Beitrag",
    replyPreview: body.replyPreview,
    repliedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
