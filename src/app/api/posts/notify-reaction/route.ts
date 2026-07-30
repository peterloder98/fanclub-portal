import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyPostReaction } from "@/lib/posts/notify-post-reaction";
import { POST_REACTION_TYPES } from "@/lib/posts/reactions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  postId: z.string().uuid(),
  reactionType: z.enum(POST_REACTION_TYPES),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await req.json());
  const admin = createSupabaseAdminClient();

  const [{ data: post }, { data: me }] = await Promise.all([
    admin
      .from("posts")
      .select("id,title,author_id,status")
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
  if (post.status !== "approved") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const reactorName =
    me?.first_name && me?.last_name
      ? `${me.first_name} ${me.last_name}`
      : (me?.email ?? "Mitglied");

  await notifyPostReaction({
    recipientUserId: post.author_id,
    reactorUserId: user.id,
    reactorName,
    postId: body.postId,
    postTitle: post.title ?? "Beitrag",
    reactionType: body.reactionType,
    reactedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
