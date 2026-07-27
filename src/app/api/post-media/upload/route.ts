import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { postMediaPublicUrl } from "@/lib/posts/media-url";
import { validateImageUpload } from "@/lib/security/upload-validation";
import { processPostMediaForStorage } from "@/lib/images/process-server";
import {
  POST_MEDIA_INPUT_MAX_BYTES,
  POST_MEDIA_MAX_BYTES,
  POST_MEDIA_MAX_COUNT,
  POST_VIDEO_INPUT_MAX_BYTES,
  POST_VIDEO_MAX_BYTES,
} from "@/lib/images/specs";
import { processPostVideoForStorage } from "@/lib/posts/process-video-server";

function isVideoBlob(b: Blob) {
  return (b.type || "").startsWith("video/");
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData();
  const files = form.getAll("files");
  const postId = (form.get("postId") as string | null) ?? null;
  const existingCount = Number(form.get("existingCount") ?? "0") || 0;

  if (!postId) return NextResponse.json({ error: "missing_postId" }, { status: 400 });

  const { data: post } = await supabase
    .from("posts")
    .select("author_id,status")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "post_not_found" }, { status: 404 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = me?.role === "admin";
  if (!isAdmin && post.author_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const blobs = files.filter((f) => f instanceof Blob) as Blob[];
  if (blobs.length === 0) return NextResponse.json({ error: "missing_files" }, { status: 400 });
  if (existingCount + blobs.length > POST_MEDIA_MAX_COUNT) {
    return NextResponse.json(
      { error: `Maximal ${POST_MEDIA_MAX_COUNT} Medien pro Post.` },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const uploaded: Array<{
    id: string;
    path: string;
    url: string | null;
    mediaType: "image" | "video";
  }> = [];

  for (let i = 0; i < blobs.length; i += 1) {
    const b = blobs[i]!;
    const video = isVideoBlob(b);

    if (video && !isAdmin) {
      return NextResponse.json({ error: "Videos können nur von Admins gepostet werden." }, { status: 403 });
    }

    let buffer: Buffer;
    let contentType: string;
    let ext: string;
    let mediaType: "image" | "video";

    if (video) {
      if (b.size > POST_VIDEO_INPUT_MAX_BYTES) {
        return NextResponse.json({ error: `Video ${i + 1} ist zu groß.` }, { status: 400 });
      }
      try {
        buffer = await processPostVideoForStorage(Buffer.from(await b.arrayBuffer()));
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : `Video ${i + 1} konnte nicht verarbeitet werden.` },
          { status: 400 },
        );
      }
      contentType = "video/mp4";
      ext = "mp4";
      mediaType = "video";
    } else {
      const validation = validateImageUpload(b, {
        maxBytes: POST_MEDIA_INPUT_MAX_BYTES,
        label: `Bild ${i + 1}`,
      });
      if (validation) {
        return NextResponse.json({ error: validation }, { status: 400 });
      }
      try {
        buffer = await processPostMediaForStorage(b);
      } catch {
        return NextResponse.json(
          { error: `Bild ${i + 1} konnte nicht verarbeitet werden.` },
          { status: 400 },
        );
      }
      if (buffer.length > POST_MEDIA_MAX_BYTES) {
        return NextResponse.json(
          { error: `Bild ${i + 1} ist auch nach Komprimierung zu groß (max. 100 KB).` },
          { status: 400 },
        );
      }
      contentType = "image/webp";
      ext = "webp";
      mediaType = "image";
    }

    const path = `${postId}/${user.id}/${Date.now()}_${i}.${ext}`;
    const { error } = await admin.storage.from("post-media").upload(path, buffer, {
      upsert: false,
      contentType,
      cacheControl: "3600",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: row, error: rowErr } = await admin
      .from("post_media")
      .insert({ post_id: postId, storage_path: path })
      .select("id")
      .single();
    if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 });

    uploaded.push({
      id: row.id,
      path,
      url: postMediaPublicUrl(path),
      mediaType,
    });
  }

  return NextResponse.json({ ok: true, files: uploaded });
}
