import { auditLog } from "@/lib/admin/audit-log";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  BOARD_RUNDMAIL_MAX_HTML_CHARS,
  BOARD_RUNDMAIL_MAX_RECIPIENTS,
  BOARD_RUNDMAIL_MAX_SUBJECT,
  type BoardRundmailSendResult,
  boardEmailHtmlToText,
  boardRundmailDeliveryError,
  boardRundmailFilesError,
  emailAttachmentFilename,
  inspectBoardRundmailFile,
  isBoardEmailBodyEmpty,
  sanitizeBoardEmailHtml,
} from "@/lib/email/board-rundmail-content";
import { listRundmailRecipients } from "@/lib/email/board-rundmail-recipients";
import {
  deleteBoardRundmailFiles,
  uploadBoardRundmailCampaign,
  type StoredBoardRundmailFile,
} from "@/lib/email/board-rundmail-storage";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { drainOutboundEmailQueue, enqueueOutboundEmails } from "@/lib/email/outbound-queue";
import { kickOutboundEmailDrain } from "@/lib/email/kick-outbound-drain";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { after } from "next/server";
import { isSmtpReady } from "@/lib/smtp/send-via-account";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function validationFailure(message: string): BoardRundmailSendResult {
  return { ok: false, message };
}

function parseRecipientIds(raw: string): { ids: string[] } | { message: string } {
  if (!raw.trim()) return { message: "Bitte mindestens ein Mitglied auswählen." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { message: "Die Auswahl ist ungültig. Bitte die Seite neu laden." };
  }
  if (!Array.isArray(parsed)) return { message: "Die Auswahl ist ungültig. Bitte die Seite neu laden." };
  if (parsed.length > BOARD_RUNDMAIL_MAX_RECIPIENTS) return { message: "Zu viele Empfänger auf einmal." };
  const ids = [
    ...new Set(
      parsed.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length < 80),
    ),
  ];
  if (!ids.length) return { message: "Bitte mindestens ein Mitglied auswählen." };
  return { ids };
}

async function loadGenders(userIds: string[]): Promise<Map<string, string | null>> {
  const admin = createSupabaseAdminClient();
  const genders = new Map<string, string | null>();
  for (let i = 0; i < userIds.length; i += 150) {
    const chunk = userIds.slice(i, i + 150);
    const { data, error } = await admin.from("profiles").select("id,gender").in("id", chunk);
    if (error) {
      if (/gender|does not exist/i.test(error.message)) return genders;
      throw new Error(error.message);
    }
    for (const row of data ?? []) {
      genders.set(row.id, (row.gender as string | null) ?? null);
    }
  }
  return genders;
}

export async function queueBoardRundmail(formData: FormData): Promise<BoardRundmailSendResult> {
  const { user } = await requireAdminAction();
  const subject = String(formData.get("subject") ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim();
  const rawHtml = String(formData.get("html") ?? "");
  const parsedIds = parseRecipientIds(String(formData.get("recipientIds") ?? ""));
  if ("message" in parsedIds) return validationFailure(parsedIds.message);
  if (!subject) return validationFailure("Bitte einen Betreff eingeben.");
  if (subject.length > BOARD_RUNDMAIL_MAX_SUBJECT) {
    return validationFailure(`Der Betreff ist zu lang (höchstens ${BOARD_RUNDMAIL_MAX_SUBJECT} Zeichen).`);
  }
  if (rawHtml.length > BOARD_RUNDMAIL_MAX_HTML_CHARS) return validationFailure("Der Text ist zu lang.");

  const html = sanitizeBoardEmailHtml(rawHtml);
  if (isBoardEmailBodyEmpty(html)) return validationFailure("Bitte einen Text schreiben.");
  const text = boardEmailHtmlToText(html);

  const uploads = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.name.trim().length > 0);
  const sizeError = boardRundmailFilesError(uploads.map((file) => ({ name: file.name, size: file.size })));
  if (sizeError) return validationFailure(sizeError);

  const storedFiles: StoredBoardRundmailFile[] = [];
  for (const [index, file] of uploads.entries()) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspected = inspectBoardRundmailFile(file.name, bytes);
    if ("error" in inspected) return validationFailure(inspected.error);
    storedFiles.push({
      path: `campaigns/pending/file-${index}`,
      filename: emailAttachmentFilename(file.name, index),
      contentType: inspected.contentType,
      bytes,
    });
  }
  const totalBytes = storedFiles.reduce((sum, file) => sum + file.bytes.byteLength, 0);
  if (boardRundmailFilesError(storedFiles.map((file) => ({ name: file.filename, size: file.bytes.byteLength })))) {
    return validationFailure("Die Anhänge sind zusammen größer als 3 MB. Bitte Dateien entfernen.");
  }
  if (totalBytes > 3 * 1024 * 1024) {
    return validationFailure("Die Anhänge sind zusammen größer als 3 MB. Bitte Dateien entfernen.");
  }

  const eligible = await listRundmailRecipients();
  const byId = new Map(eligible.map((recipient) => [recipient.userId, recipient]));
  const chosen = parsedIds.ids.flatMap((id) => {
    const recipient = byId.get(id);
    return recipient ? [recipient] : [];
  });
  const skippedIneligible = parsedIds.ids.length - chosen.length;
  if (!chosen.length) {
    return validationFailure("Bitte mindestens ein aktives Mitglied mit E-Mail auswählen.");
  }

  if (!(await isSmtpReady())) {
    return validationFailure(
      "Das Club-Postfach ist noch nicht eingerichtet. Bitte zuerst unter E-Mail-Konten ein Konto anlegen.",
    );
  }

  const admin = createSupabaseAdminClient();
  const campaignId = crypto.randomUUID();
  const files = storedFiles.map((file, index) => ({
    ...file,
    path: `campaigns/${campaignId}/file-${index}`,
  }));

  try {
    await uploadBoardRundmailCampaign(admin, campaignId, { subject, html, text, files });
  } catch (error) {
    console.error("[rundmail] Speichern fehlgeschlagen:", error instanceof Error ? error.message : "unknown");
    await deleteBoardRundmailFiles(admin, campaignId).catch(() => {});
    return validationFailure("Die Mail konnte nicht gespeichert werden. Bitte später erneut versuchen.");
  }

  try {
    const genders = await loadGenders(chosen.map((recipient) => recipient.userId));
    const queuedItems = chosen.map((recipient) => {
      const person = emailPersonVars({
        firstName: recipient.firstName || "Fan",
        gender: genders.get(recipient.userId),
      });
      return {
        to: recipient.email,
        templateKey: EMAIL_TEMPLATE_KEYS.boardRundmail,
        templateVars: {
          first_name: person.first_name,
          salutation: person.salutation,
        },
        context: { rundmail_id: campaignId },
        dedupeKey: `rundmail:${campaignId}:${recipient.userId}`,
      };
    });
    const { queued, duplicate, errors } = await enqueueOutboundEmails(admin, queuedItems);
    const notQueued = duplicate + errors;
    if (queued <= 0) {
      await deleteBoardRundmailFiles(admin, campaignId).catch(() => {});
      return validationFailure("Die Mail konnte nicht eingereiht werden. Bitte später erneut versuchen.");
    }
    // Wenige Empfänger direkt zustellen, damit ein Test nicht nur „eingereiht“ bleibt.
    if (queued <= 3) {
      try {
        const drained = await drainOutboundEmailQueue(admin, {
          dedupePrefix: `rundmail:${campaignId}:%`,
        });
        if (drained.sent <= 0) {
          return validationFailure(boardRundmailDeliveryError(drained.lastError));
        }
        await auditLog({
          actorId: user.id,
          action: "board_rundmail.queue",
          summary: `Rundmail verschickt: „${subject.slice(0, 120)}“ an ${drained.sent} Mitglieder`,
          entityType: "board_rundmail",
          entityId: campaignId,
          metadata: {
            recipient_count: drained.sent,
            not_queued: notQueued + drained.failed,
            skipped_ineligible: skippedIneligible,
            attachment_count: files.length,
            delivered: true,
          },
        });
        return {
          ok: true,
          queued: drained.sent,
          notQueued: notQueued + drained.failed,
          skippedIneligible,
          delivered: true,
        };
      } catch (error) {
        console.error(
          "[rundmail] Direktversand fehlgeschlagen:",
          error instanceof Error ? error.message : "unknown",
        );
        return validationFailure(boardRundmailDeliveryError(null));
      }
    }
    after(async () => {
      await kickOutboundEmailDrain(admin);
    });
    await auditLog({
      actorId: user.id,
      action: "board_rundmail.queue",
      summary: `Rundmail eingereiht: „${subject.slice(0, 120)}“ an ${queued} Mitglieder`,
      entityType: "board_rundmail",
      entityId: campaignId,
      metadata: {
        recipient_count: queued,
        not_queued: notQueued,
        skipped_ineligible: skippedIneligible,
        attachment_count: files.length,
        delivered: false,
      },
    });
    return { ok: true, queued, notQueued, skippedIneligible, delivered: false };
  } catch (error) {
    console.error("[rundmail] Einreihen fehlgeschlagen:", error instanceof Error ? error.message : "unknown");
    await deleteBoardRundmailFiles(admin, campaignId).catch(() => {});
    return validationFailure("Die Mail konnte nicht eingereiht werden. Bitte später erneut versuchen.");
  }
}
