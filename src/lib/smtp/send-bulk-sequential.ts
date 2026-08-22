import { sendEmailWithLog } from "@/lib/email/send-log";
import type { SendViaAccountInput } from "@/lib/smtp/send-via-account";
import {
  isSmtpAuthFailure,
  paceBulkOutboundEmail,
} from "@/lib/smtp/outbound-throttle";

export type BulkEmailItem = SendViaAccountInput & {
  templateKey?: string;
  context?: Record<string, unknown>;
};

export type BulkSequentialResult = {
  sent: number;
  failed: number;
  skipped: number;
  abortedAuth: boolean;
};

/**
 * Einzelne Mails nacheinander mit Pause — für Cron-Batches (z. B. 20 Erinnerungen).
 * Bricht bei SMTP-Login-Fehler (535) ab, um Kontosperren zu vermeiden.
 */
export async function sendBulkEmailsSequential(
  items: BulkEmailItem[],
): Promise<BulkSequentialResult> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let abortedAuth = false;

  for (let i = 0; i < items.length; i++) {
    if (i > 0) await paceBulkOutboundEmail(sent);

    const item = items[i]!;
    const result = await sendEmailWithLog({
      to: item.to,
      subject: item.subject,
      text: item.text,
      html: item.html,
      attachments: item.attachments,
      templateKey: item.templateKey,
      context: item.context,
    });

    if (result.ok) {
      sent += 1;
      continue;
    }
    if ("skipped" in result && result.skipped) {
      skipped += 1;
      continue;
    }

    failed += 1;
    const errMsg = ("error" in result && result.error) || "Versand fehlgeschlagen";
    if (isSmtpAuthFailure(String(errMsg))) {
      abortedAuth = true;
      console.error("[bulk-email] SMTP-Login abgelehnt — Batch gestoppt:", errMsg);
      break;
    }
  }

  return { sent, failed, skipped, abortedAuth };
}
