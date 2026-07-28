import { NextResponse } from "next/server";
import { loadApplicationPdfBytes } from "@/lib/membership/application-pdf-service";
import { verifyMembershipDownloadToken } from "@/lib/membership/download-token";
import { membershipApplicationPdfFilename } from "@/lib/membership/pdf-filename";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const forceDownload = url.searchParams.get("download") === "1";

  let allowed = false;

  if (token && verifyMembershipDownloadToken(id, token)) {
    allowed = true;
  } else {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role === "admin") allowed = true;
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: appRow } = await admin
      .from("membership_applications")
      .select("first_name,last_name")
      .eq("id", id)
      .maybeSingle();

    const pdf = await loadApplicationPdfBytes(id);
    const filename = membershipApplicationPdfFilename(
      appRow?.first_name ?? "",
      appRow?.last_name ?? "",
    );
    const disposition = forceDownload
      ? `attachment; filename="${filename}"`
      : `inline; filename="${filename}"`;
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF fehlgeschlagen";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
