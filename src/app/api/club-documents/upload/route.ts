import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateImageUpload } from "@/lib/security/upload-validation";
import {
  processMerchandiseImageForStorage,
  processReceiptForStorage,
} from "@/lib/images/process-server";
import {
  CLUB_DOCUMENTS_BUCKET,
  DOCUMENT_INPUT_MAX_BYTES,
  MERCHANDISE_IMAGE_MAX_BYTES,
  RECEIPT_MAX_BYTES,
} from "@/lib/images/specs";

export async function POST(request: Request) {
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

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "receipt");
  const targetId = String(form.get("targetId") ?? "").trim();

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const uploadErrMsg = validateImageUpload(file, {
    maxBytes: DOCUMENT_INPUT_MAX_BYTES,
    label: kind === "merchandise" ? "Produktfoto" : "Beleg",
  });
  if (uploadErrMsg) {
    return NextResponse.json({ error: uploadErrMsg }, { status: 400 });
  }

  let optimized: Buffer;
  let maxBytes: number;
  try {
    if (kind === "merchandise") {
      optimized = await processMerchandiseImageForStorage(file);
      maxBytes = MERCHANDISE_IMAGE_MAX_BYTES;
    } else {
      optimized = await processReceiptForStorage(file);
      maxBytes = RECEIPT_MAX_BYTES;
    }
  } catch {
    return NextResponse.json({ error: "Bild konnte nicht verarbeitet werden." }, { status: 400 });
  }

  if (optimized.length > maxBytes) {
    return NextResponse.json({ error: "Bild nach Komprimierung zu groß." }, { status: 400 });
  }

  const folder = kind === "merchandise" ? "merchandise" : "receipts";
  const suffix = targetId || crypto.randomUUID();
  const objectPath = `${folder}/${suffix}.webp`;

  const admin = createSupabaseAdminClient();
  const { error: uploadErr } = await admin.storage
    .from(CLUB_DOCUMENTS_BUCKET)
    .upload(objectPath, optimized, {
      upsert: true,
      contentType: "image/webp",
      cacheControl: "3600",
    });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path: objectPath });
}
