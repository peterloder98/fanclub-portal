import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { postMediaPublicUrl } from "@/lib/posts/media-url";
import { validateImageUpload } from "@/lib/security/upload-validation";
import { processPostMediaForStorage } from "@/lib/images/process-server";
import { POST_MEDIA_INPUT_MAX_BYTES, POST_MEDIA_MAX_BYTES } from "@/lib/images/specs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData();
  const files = form.getAll("files");
  const postId = (form.get("postId") as string | null) ?? null;

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
  if (blobs.length > 4) return NextResponse.json({ error: "too_many_files" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const uploaded: Array<{ path: string; url: string | null }> = [];

  for (let i = 0; i < blobs.length; i += 1) {
    const b = blobs[i]!;
    const validation = validateImageUpload(b, {
      maxBytes: POST_MEDIA_INPUT_MAX_BYTES,
      label: `Bild ${i + 1}`,
    });
    if (validation) {
      return NextResponse.json({ error: validation }, { status: 400 });
    }

    let optimized: Buffer;
    try {
      optimized = await processPostMediaForStorage(b);
    } catch {
      return NextResponse.json(
        { error: `Bild ${i + 1} konnte nicht verarbeitet werden.` },
        { status: 400 },
      );
    }
    if (optimized.length > POST_MEDIA_MAX_BYTES) {
      return NextResponse.json(
        { error: `Bild ${i + 1} ist auch nach Komprimierung zu groß (max. 100 KB).` },
        { status: 400 },
      );
    }

    const path = `${postId}/${user.id}/${Date.now()}_${i}.webp`;
    const { error } = await admin.storage.from("post-media").upload(path, optimized, {
      upsert: false,
      contentType: "image/webp",
      cacheControl: "3600",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    uploaded.push({ path, url: postMediaPublicUrl(path) });
  }

  // Insert media rows (service role bypasses RLS).
  const { error: insertErr } = await admin.from("post_media").insert(
    uploaded.map((u) => ({
      post_id: postId,
      storage_path: u.path,
    })),
  );
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, files: uploaded });
}

