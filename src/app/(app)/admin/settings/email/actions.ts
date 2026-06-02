"use server";

import {
  createSmtpAccount,
  deleteSmtpAccount,
  listSmtpAccounts,
  seedSmtpFromEnvIfEmpty,
  setDefaultSmtpAccount,
  testSmtpConnection,
  updateSmtpAccount,
} from "@/lib/smtp/accounts";
import type { SmtpEncryption } from "@/lib/smtp/types";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function loadSmtpAccountsAction() {
  await requireAdmin();
  await seedSmtpFromEnvIfEmpty().catch(() => {});
  return listSmtpAccounts();
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

export async function testSmtpAccountAction(id?: string) {
  await requireAdmin();
  return testSmtpConnection(id);
}

export async function sendSmtpTestMailAction(id: string) {
  const { profile } = await requireAdmin();
  const to = profile.email;
  if (!to) throw new Error("Dein Admin-Profil hat keine E-Mail.");
  await testSmtpConnection(id);
  await sendEmailViaAccount({
    accountId: id,
    to,
    subject: "Fanclub SMTP Test",
    text: "Die SMTP-Verbindung funktioniert.",
  });
  return { ok: true, to };
}
