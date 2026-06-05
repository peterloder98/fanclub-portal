import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signedClubDocumentUrl } from "@/lib/club/documents";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const path = new URL(request.url).searchParams.get("path");
  if (!path || path.includes("..")) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  const url = await signedClubDocumentUrl(path);
  if (!url) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ url });
}
