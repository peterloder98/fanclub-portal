import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminSignatureMail } from "@/lib/email/admin-signature-mail";
import {
  getClubSignatureImagePath,
  getClubSignatureText,
} from "@/lib/email/club-signature-settings";

export const CLUB_SIGNATURE_ID = "club-default";

export type MailSignatureOption = {
  id: string;
  label: string;
  kind: "club" | "board";
};

export async function listMailSignatureOptions(): Promise<MailSignatureOption[]> {
  const admin = createSupabaseAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id,first_name,last_name,role,admin_signature_text,admin_signature_image_path")
    .in("role", ["admin", "anni"])
    .order("last_name", { ascending: true });
  if (error) throw new Error(error.message);

  const options: MailSignatureOption[] = [
    { id: CLUB_SIGNATURE_ID, label: "Fanclub (allgemein)", kind: "club" },
  ];

  for (const p of profiles ?? []) {
    if (!p.admin_signature_text?.trim() && !p.admin_signature_image_path) continue;
    const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Vorstand";
    options.push({
      id: p.id,
      label: `${name} (${p.role === "anni" ? "Anni" : "Vorstand"})`,
      kind: "board",
    });
  }

  return options;
}

const CID = "admin-signature";

export async function loadMailSignature(
  signatureId: string,
): Promise<AdminSignatureMail> {
  const admin = createSupabaseAdminClient();

  if (signatureId === CLUB_SIGNATURE_ID) {
    const text = await getClubSignatureText();
    const imagePath = await getClubSignatureImagePath();
    let imageBuffer: Buffer | null = null;
    let contentType = "image/png";
    if (imagePath) {
      const { data: file, error: dlErr } = await admin.storage
        .from("signatures")
        .download(imagePath);
      if (!dlErr && file) {
        imageBuffer = Buffer.from(await file.arrayBuffer());
        contentType = file.type || "image/png";
      }
    }
    const htmlBlock = imageBuffer
      ? `<p style="margin-top:1.25rem"><img src="cid:club-signature" alt="Fanclub-Signatur" style="max-width:220px;height:auto" /></p><p style="white-space:pre-line;font-size:14px;color:#334155">${escapeHtml(text)}</p>`
      : `<p style="margin-top:1.25rem;white-space:pre-line;font-size:14px;color:#334155">${escapeHtml(text)}</p>`;
    return {
      text,
      htmlBlock,
      imageCid: imageBuffer ? "club-signature" : null,
      imageBuffer,
      contentType,
    };
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("admin_signature_text,admin_signature_image_path")
    .eq("id", signatureId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const text =
    profile?.admin_signature_text?.trim() ?? (await getClubSignatureText());
  let imageBuffer: Buffer | null = null;
  let contentType = "image/png";

  if (profile?.admin_signature_image_path) {
    const { data: file, error: dlErr } = await admin.storage
      .from("signatures")
      .download(profile.admin_signature_image_path);
    if (!dlErr && file) {
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
