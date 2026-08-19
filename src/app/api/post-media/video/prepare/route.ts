import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { POST_MEDIA_MAX_COUNT, POST_VIDEO_INPUT_MAX_BYTES } from "@/lib/images/specs";
import { assertPostMediaAccess } from "@/lib/posts/post-media-access";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    postId?: string;
    fileSize?: number;
    existingCount?: number;
  };
  const { postId, fileSize, existingCount = 0 } = body;

  if (!postId) return NextResponse.json({ error: "missing_postId" }, { status: 400 });
  if (typeof fileSize !== "number" || fileSize <= 0) {
    return NextResponse.json({ error: "missing_fileSize" }, { status: 400 });
  }
  if (fileSize > POST_VIDEO_INPUT_MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Video zu groß — max. ${Math.round(POST_VIDEO_INPUT_MAX_BYTES / 1024 / 1024)} MB.`,
      },
      { status: 400 },
    );
  }
  if (existingCount + 1 > POST_MEDIA_MAX_COUNT) {
    return NextResponse.json(
      { error: `Maximal ${POST_MEDIA_MAX_COUNT} Medien pro Post.` },
      { status: 400 },
    );
  }

  const access = await assertPostMediaAccess(supabase, user.id, postId, { requireAdmin: true });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const rawPath = `${postId}/${user.id}/raw_${Date.now()}.mp4`;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from("post-media").createSignedUploadUrl(rawPath);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "signed_url_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    signedUrl: data.signedUrl,
    token: data.token,
    rawPath: data.path,
  });
}
