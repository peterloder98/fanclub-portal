"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { listEmailSendLog, resendEmailLogEntry } from "@/lib/email/send-log";

export async function fetchEmailSendLogAction() {
  await requireAdminAction();
  return listEmailSendLog(100);
}

export async function resendEmailLogEntryAction(logId: string) {
  await requireAdminAction();
  const result = await resendEmailLogEntry(logId);
  revalidatePath("/admin/settings/email-log");
  return result;
}
