import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getClubSignatureImagePath,
  getClubSignatureText,
  setClubSignatureImagePath,
  setClubSignatureText,
} from "@/lib/email/club-signature-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const text = await getClubSignatureText();
  const imagePath = await getClubSignatureImagePath();
  let imageUrl: string | null = null;
  if (imagePath) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.storage.from("signatures").createSignedUrl(imagePath, 3600);
    imageUrl = data?.signedUrl ?? null;
  }
  return NextResponse.json({ text, imagePath, imageUrl });
}

const textSchema = z.object({ text: z.string() });

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { text } = textSchema.parse(await req.json());
    await setClubSignatureText(text);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const contentType = (form.get("contentType") as string | null) ?? "image/png";
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const objectPath = "club/signature.png";
  const { error: uploadErr } = await admin.storage
    .from("signatures")
    .upload(objectPath, file, { upsert: true, contentType, cacheControl: "3600" });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  await setClubSignatureImagePath(objectPath);
  const { data } = await admin.storage.from("signatures").createSignedUrl(objectPath, 3600);
  return NextResponse.json({ ok: true, path: objectPath, imageUrl: data?.signedUrl ?? null });
}
