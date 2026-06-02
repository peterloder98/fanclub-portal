import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EmailTemplateKey } from "@/lib/email/template-keys";
import { loadAdminSignatureForMail } from "@/lib/email/admin-signature-mail";

export type EmailTemplateRow = {
  key: string;
  name: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  description: string | null;
};

export async function getEmailTemplate(key: EmailTemplateKey): Promise<EmailTemplateRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("email_templates").select("*").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data as EmailTemplateRow | null;
}

export async function listEmailTemplates(): Promise<EmailTemplateRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("email_templates")
    .select("key,name,subject,body_text,body_html,description")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as EmailTemplateRow[];
}

function replaceVars(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

function textToHtmlParagraphs(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 1em;font-size:15px;line-height:1.5;color:#1e293b">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function renderEmailFromTemplate(
  key: EmailTemplateKey,
  vars: Record<string, string>,
) {
  const row = await getEmailTemplate(key);
  if (!row) throw new Error(`E-Mail-Vorlage „${key}“ fehlt. Bitte 020_email_templates.sql ausführen.`);

  const sig = await loadAdminSignatureForMail();
  const allVars: Record<string, string> = {
    ...vars,
    admin_signature_text: sig.text,
    admin_signature_block: sig.htmlBlock,
  };

  const subject = replaceVars(row.subject, allVars);
  const text = replaceVars(row.body_text, allVars);

  const bodyHtml = row.body_html?.trim()
    ? replaceVars(row.body_html, allVars)
    : `${textToHtmlParagraphs(
        replaceVars(
          row.body_text.replace(/\{\{admin_signature_block\}\}/g, "").replace(/\{\{admin_signature_text\}\}/g, ""),
          allVars,
        ),
      )}${sig.htmlBlock}`;

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f8fafc;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0">${bodyHtml}</div></body></html>`;

  return {
    subject,
    text,
    html,
    signatureAttachment: sig.imageBuffer
      ? {
          filename: "signatur.png",
          content: sig.imageBuffer,
          contentType: sig.contentType,
          cid: sig.imageCid!,
        }
      : null,
  };
}
