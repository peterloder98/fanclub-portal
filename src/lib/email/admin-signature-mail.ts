import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminSignatureMail = {
  text: string;
  htmlBlock: string;
  imageCid: string | null;
  imageBuffer: Buffer | null;
  contentType: string;
};

const CID = "admin-signature";

export async function loadAdminSignatureForMail(): Promise<AdminSignatureMail> {
  const admin = createSupabaseAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("admin_signature_text,admin_signature_image_path")
    .eq("role", "admin")
    .order("updated_at", { ascending: false });

  const withImage = (profiles ?? []).find((p) => p.admin_signature_image_path);
  const withText = (profiles ?? []).find((p) => p.admin_signature_text?.trim());
  const picked = withImage ?? withText ?? profiles?.[0];

  const text = picked?.admin_signature_text?.trim() ?? "Anni-Perka-Fanclub e. V.";

  let imageBuffer: Buffer | null = null;
  let contentType = "image/png";

  if (picked?.admin_signature_image_path) {
    const { data: file, error } = await admin.storage
      .from("signatures")
      .download(picked.admin_signature_image_path);
    if (!error && file) {
      imageBuffer = Buffer.from(await file.arrayBuffer());
      contentType = file.type || "image/png";
    }
  }

  const htmlBlock = imageBuffer
    ? `<p style="margin-top:1.25rem"><img src="cid:${CID}" alt="Signatur" style="max-width:220px;height:auto" /></p><p style="white-space:pre-line;font-size:14px;color:#334155">${escapeHtml(text)}</p>`
    : `<p style="margin-top:1.25rem;white-space:pre-line;font-size:14px;color:#334155">${escapeHtml(text)}</p>`;

  return {
    text,
    htmlBlock,
    imageCid: imageBuffer ? CID : null,
    imageBuffer,
    contentType,
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
