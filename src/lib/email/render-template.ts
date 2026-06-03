import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EMAIL_TEMPLATE_KEYS, type EmailTemplateKey } from "@/lib/email/template-keys";
import { loadDefaultMailSignature } from "@/lib/email/default-mail-signature";
import { loadMailSignature } from "@/lib/email/signatures";

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

/** Entfernt Signatur-Platzhalter und typische Abschlusszeilen (werden separat angehängt). */
export function stripTemplateBodyArtifacts(body: string): string {
  let t = body
    .replace(/\{\{admin_signature_block\}\}/gi, "")
    .replace(/\{\{admin_signature_text\}\}/gi, "")
    .trimEnd();

  const trailingLine =
    /^(liebe grüße|viele grüße|herzliche grüße|mit freundlichen grüßen|freundliche grüße|deine anni perka fanclub app|eure anni perka fanclub app|wir freuen uns)/i;

  const lines = t.split("\n");
  while (lines.length > 0) {
    const last = lines[lines.length - 1]?.trim() ?? "";
    if (!last) {
      lines.pop();
      continue;
    }
    if (trailingLine.test(last)) {
      lines.pop();
      continue;
    }
    break;
  }
  return lines.join("\n").trimEnd();
}

function appendSignatureToPlainText(body: string, signatureText: string) {
  const core = stripTemplateBodyArtifacts(body);
  if (!signatureText.trim()) return core;
  return core ? `${core}\n\n${signatureText.trim()}` : signatureText.trim();
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

const PAYMENT_REMINDER_FALLBACK = {
  subject: "Zahlungserinnerung Mitgliedsbeitrag Anni Perka Fanclub",
  body_text: `Hallo {{first_name}},

vielen Dank für deinen Mitgliedschaftsantrag beim Anni-Perka-Fanclub e. V.

Der Mitgliedsbeitrag in Höhe von {{fee_eur}} ist bei uns noch nicht eingegangen. Bitte überweise den Betrag auf das im Antrag genannte Konto.

Erst nach Zahlungseingang schalten wir deinen Zugang zur Fanclub-App frei und nehmen dich – sofern gewünscht – in die WhatsApp-Gruppe als aktives Mitglied auf.

Bei Fragen melde dich gerne bei uns.`,
};

export async function renderEmailFromTemplate(
  key: EmailTemplateKey,
  vars: Record<string, string>,
  opts?: { signatureId?: string },
) {
  let row = await getEmailTemplate(key);
  if (!row && key === EMAIL_TEMPLATE_KEYS.membershipPaymentReminder) {
    row = {
      key,
      name: "Zahlungserinnerung",
      subject: PAYMENT_REMINDER_FALLBACK.subject,
      body_text: PAYMENT_REMINDER_FALLBACK.body_text,
      body_html: null,
      description: null,
    };
  }
  if (!row) {
    throw new Error(
      `E-Mail-Vorlage „${key}“ fehlt. Bitte supabase/020_email_templates.sql und 023 ausführen.`,
    );
  }

  const sig = opts?.signatureId
    ? await loadMailSignature(opts.signatureId)
    : await loadDefaultMailSignature();
  const allVars: Record<string, string> = {
    ...vars,
    admin_signature_text: sig.text,
    admin_signature_block: sig.htmlBlock,
  };

  const subject = replaceVars(row.subject, allVars);
  const bodyCore = stripTemplateBodyArtifacts(row.body_text);
  const text = appendSignatureToPlainText(replaceVars(bodyCore, allVars), sig.text);

  const bodyHtml = row.body_html?.trim()
    ? replaceVars(stripTemplateBodyArtifacts(row.body_html), allVars)
    : `${textToHtmlParagraphs(replaceVars(bodyCore, allVars))}${sig.htmlBlock}`;

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
