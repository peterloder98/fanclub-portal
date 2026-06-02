import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,admin_signature_image_path")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const path = profile.admin_signature_image_path;
  if (!path) {
    return NextResponse.json({ error: "no_signature" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from("signatures").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "signed_url_failed" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
