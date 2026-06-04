import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateImageUpload } from "@/lib/security/upload-validation";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const contentType = (form.get("contentType") as string | null) ?? "image/webp";

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const uploadErrMsg = validateImageUpload(file, {
    maxBytes: 2 * 1024 * 1024,
    label: "Profilbild",
  });
  if (uploadErrMsg) {
    return NextResponse.json({ error: uploadErrMsg }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const objectPath = `${user.id}/avatar.webp`;

  const { error: uploadErr } = await admin.storage
    .from("avatars")
    .upload(objectPath, file, {
      upsert: true,
      contentType,
      cacheControl: "3600",
    });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ avatar_path: objectPath })
    .eq("id", user.id);
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true, avatar_path: objectPath });
}

