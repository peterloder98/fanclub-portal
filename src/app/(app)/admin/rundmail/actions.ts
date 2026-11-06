"use server";

import { after } from "next/server";
import {
  type BoardRundmailSendResult,
} from "@/lib/email/board-rundmail-content";
import { queueBoardRundmail } from "@/lib/email/board-rundmail-send";
import { scheduleOutboundDrainContinuation } from "@/lib/email/kick-outbound-drain";

export async function sendBoardRundmailAction(formData: FormData): Promise<BoardRundmailSendResult> {
  try {
    const result = await queueBoardRundmail(formData);
    if (result.ok && result.queued > 0) {
      after(() => {
        scheduleOutboundDrainContinuation();
      });
    }
    return result;
  } catch (error) {
    console.error("[rundmail] Versand fehlgeschlagen:", error instanceof Error ? error.message : "unknown");
    const raw = error instanceof Error ? error.message : "";
    if (/Nicht angemeldet|Keine Berechtigung/.test(raw)) {
      return { ok: false, message: raw };
    }
    return {
      ok: false,
      message: "Die Mail konnte nicht vorbereitet werden. Bitte später erneut versuchen.",
    };
  }
}
