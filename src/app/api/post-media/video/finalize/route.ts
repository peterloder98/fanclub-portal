import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { postMediaPublicUrl } from "@/lib/posts/media-url";
import { processPostVideoForStorage } from "@/lib/posts/process-video-server";
import {
  assertPostMediaAccess,
  isValidPostMediaRawPath,
} from "@/lib/posts/post-media-access";

export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as { postId?: string; rawPath?: string };
  const { postId, rawPath } = body;

  if (!postId || !rawPath) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!isValidPostMediaRawPath(rawPath, postId, user.id)) {
    return NextResponse.json({ error: "invalid_rawPath" }, { status: 400 });
  }

  const access = await assertPostMediaAccess(supabase, user.id, postId, { requireAdmin: true });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createSupabaseAdminClient();
  const { data: rawBlob, error: downloadErr } = await admin.storage
    .from("post-media")
    .download(rawPath);
  if (downloadErr || !rawBlob) {
    return NextResponse.json(
      { error: downloadErr?.message ?? "raw_download_failed" },
      { status: 400 },
    );
  }

  let buffer: Buffer;
  try {
    buffer = await processPostVideoForStorage(Buffer.from(await rawBlob.arrayBuffer()));
  } catch (e) {
    await admin.storage.from("post-media").remove([rawPath]).catch(() => {});
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Video konnte nicht verarbeitet werden." },
      { status: 400 },
    );
  }

  const finalPath = `${postId}/${user.id}/${Date.now()}_0.mp4`;
  const { error: uploadErr } = await admin.storage.from("post-media").upload(finalPath, buffer, {
    upsert: false,
    contentType: "video/mp4",
    cacheControl: "3600",
  });
  await admin.storage.from("post-media").remove([rawPath]).catch(() => {});
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: row, error: rowErr } = await admin
    .from("post_media")
    .insert({ post_id: postId, storage_path: finalPath })
    .select("id")
    .single();
  if (rowErr) {
    await admin.storage.from("post-media").remove([finalPath]).catch(() => {});
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    files: [
      {
        id: row.id,
        path: finalPath,
        url: postMediaPublicUrl(finalPath),
        mediaType: "video" as const,
      },
    ],
  });
}
