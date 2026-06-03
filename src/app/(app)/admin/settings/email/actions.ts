"use server";

import {
  createSmtpAccount,
  deleteSmtpAccount,
  listSmtpAccounts,
  setDefaultSmtpAccount,
  testSmtpConnection,
  updateSmtpAccount,
} from "@/lib/smtp/accounts";
import { prepareSmtpForSend } from "@/lib/smtp/prepare-send";
import type { SmtpEncryption } from "@/lib/smtp/types";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { formatSmtpError } from "@/lib/smtp/errors";
import { requireAdmin } from "@/lib/admin/require-admin";
import type { SmtpAccountPublic } from "@/lib/smtp/types";

async function prepareSmtpEnv() {
  await prepareSmtpForSend().catch(() => {});
}

export async function loadSmtpAccountsAction(): Promise<
  | { ok: true; accounts: SmtpAccountPublic[] }
  | { ok: false; error: string; accounts: SmtpAccountPublic[] }
> {
  try {
    await requireAdmin();
    await prepareSmtpEnv();
    const accounts = await listSmtpAccounts();
    return { ok: true, accounts };
  } catch (e) {
    return { ok: false, error: formatSmtpError(e), accounts: [] };
  }
}

export async function createSmtpAccountAction(formData: FormData) {
  await requireAdmin();
  const password = String(formData.get("password") ?? "");
  await createSmtpAccount({
    server: String(formData.get("server") ?? ""),
    port: Number(formData.get("port") ?? 465),
    encryption: String(formData.get("encryption") ?? "SSL") as SmtpEncryption,
    email: String(formData.get("email") ?? ""),
    password: password || undefined,
    display_name: String(formData.get("display_name") ?? "") || null,
    reply_to: String(formData.get("reply_to") ?? "") || null,
    is_default: formData.get("is_default") === "on",
    artistflow_id: String(formData.get("artistflow_id") ?? "") || null,
  });
}

export async function updateSmtpAccountAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  await updateSmtpAccount(id, {
    server: String(formData.get("server") ?? ""),
    port: Number(formData.get("port") ?? 465),
    encryption: String(formData.get("encryption") ?? "SSL") as SmtpEncryption,
    email: String(formData.get("email") ?? ""),
    password: password || undefined,
    display_name: String(formData.get("display_name") ?? "") || null,
    reply_to: String(formData.get("reply_to") ?? "") || null,
    is_default: formData.get("is_default") === "on",
    artistflow_id: String(formData.get("artistflow_id") ?? "") || null,
  });
}

export async function deleteSmtpAccountAction(id: string) {
  await requireAdmin();
  await deleteSmtpAccount(id);
}

export async function setDefaultSmtpAccountAction(id: string) {
  await requireAdmin();
  await setDefaultSmtpAccount(id);
}

export async function testSmtpAccountAction(
  id?: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await prepareSmtpEnv();
    return await testSmtpConnection(id);
  } catch (e) {
    return { ok: false, error: formatSmtpError(e) };
  }
}

export async function sendSmtpTestMailAction(
  id: string,
): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  try {
    const { profile } = await requireAdmin();
    const to = profile.email?.trim();
    if (!to) {
      return { ok: false, error: "Dein Admin-Profil hat keine E-Mail-Adresse." };
    }

    await prepareSmtpEnv();
    const verified = await testSmtpConnection(id);
    if (!verified.ok) return verified;

    const sent = await sendEmailViaAccount({
      accountId: id,
      to,
      subject: "Fanclub SMTP Test",
      text: "Die SMTP-Verbindung funktioniert.",
    });

    if (!sent.ok) {
      return {
        ok: false,
        error:
          "error" in sent && sent.error
            ? sent.error
            : sent.skipped
              ? "Kein SMTP-Konto konfiguriert."
              : "Test-Mail konnte nicht gesendet werden.",
      };
    }

    return { ok: true, to };
  } catch (e) {
    return { ok: false, error: formatSmtpError(e) };
  }
}
