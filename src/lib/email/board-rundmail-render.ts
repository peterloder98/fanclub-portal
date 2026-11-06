import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attachment } from "nodemailer/lib/mailer";
import {
  BOARD_RUNDMAIL_MAX_HTML_CHARS,
  BOARD_RUNDMAIL_MAX_SUBJECT,
  boardEmailHtmlToText,
  composeBoardRundmailMessage,
  isBoardEmailBodyEmpty,
  sanitizeBoardEmailHtml,
} from "@/lib/email/board-rundmail-content";
import { downloadBoardRundmailCampaign, rundmailIdFromContext } from "@/lib/email/board-rundmail-storage";
import { loadDefaultMailSignature } from "@/lib/email/default-mail-signature";

type CachedCampaign = {
  subject: string;
  html: string;
  text: string;
  files: Attachment[];
  signatureHtml: string;
  signatureText: string;
  signatureAttachment: Attachment | null;
};

export type BoardRundmailRenderCache = Map<string, CachedCampaign>;

async function loadCampaign(
  admin: SupabaseClient,
  campaignId: string,
): Promise<CachedCampaign> {
  const downloaded = await downloadBoardRundmailCampaign(admin, campaignId);
  const subject = downloaded.manifest.subject.replace(/[\r\n]+/g, " ").trim().slice(0, BOARD_RUNDMAIL_MAX_SUBJECT);
  if (downloaded.manifest.html.length > BOARD_RUNDMAIL_MAX_HTML_CHARS * 2) {
    throw new Error("Rundmail-Text ist zu groß");
  }
  const html = sanitizeBoardEmailHtml(downloaded.manifest.html);
  if (isBoardEmailBodyEmpty(html) || !subject) throw new Error("Rundmail-Text ist leer");
  const signature = await loadDefaultMailSignature();
  const signatureAttachment =
    signature.imageBuffer && signature.imageCid
      ? {
          filename: "signatur.png",
          content: signature.imageBuffer,
          contentType: signature.contentType,
          cid: signature.imageCid,
        }
      : null;
  return {
    subject,
    html,
    text: boardEmailHtmlToText(html),
    files: downloaded.files.map((file) => ({
      filename: file.filename,
      content: file.content,
      contentType: file.contentType,
    })),
    signatureHtml: signature.htmlBlock,
    signatureText: signature.text,
    signatureAttachment,
  };
}

export async function renderQueuedBoardRundmail(
  admin: SupabaseClient,
  row: { template_vars: Record<string, string>; context: Record<string, unknown> },
  cache: BoardRundmailRenderCache,
): Promise<{ subject: string; text: string; html: string; attachments: Attachment[] }> {
  const campaignId = rundmailIdFromContext(row.context);
  if (!campaignId) throw new Error("Rundmail-Daten fehlen");
  let cached = cache.get(campaignId);
  if (!cached) {
    cached = await loadCampaign(admin, campaignId);
    cache.set(campaignId, cached);
  }
  const firstName = row.template_vars.first_name?.trim() || "Fan";
  const salutation = row.template_vars.salutation?.trim() || `Liebe/r ${firstName}`;
  const message = composeBoardRundmailMessage({
    subject: cached.subject,
    html: cached.html,
    text: cached.text,
    firstName,
    salutation,
    signatureHtml: cached.signatureHtml,
    signatureText: cached.signatureText,
  });
  const attachments = [...cached.files];
  if (cached.signatureAttachment) attachments.push(cached.signatureAttachment);
  return { ...message, attachments };
}
