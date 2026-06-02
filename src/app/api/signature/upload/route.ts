import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
  const contentType = (form.get("contentType") as string | null) ?? "image/png";

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const objectPath = `${user.id}/signature.png`;

  const { error: uploadErr } = await admin.storage
    .from("signatures")
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
    .update({ admin_signature_image_path: objectPath })
    .eq("id", user.id);
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path: objectPath });
}

