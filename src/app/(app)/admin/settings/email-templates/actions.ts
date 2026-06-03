"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EmailTemplateKey } from "@/lib/email/template-keys";
import {
  getDefaultMailSignatureId,
  setDefaultMailSignatureId,
} from "@/lib/email/default-mail-signature";
import { listMailSignatureOptions } from "@/lib/email/signatures";

export async function loadEmailTemplatesAction() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("email_templates")
    .select("key,name,subject,body_text,body_html,description")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveEmailTemplateAction(formData: FormData) {
  await requireAdmin();
  const key = String(formData.get("key") ?? "") as EmailTemplateKey;
  const subject = String(formData.get("subject") ?? "").trim();
  const body_text = String(formData.get("body_text") ?? "").trim();
  const body_html = String(formData.get("body_html") ?? "").trim();

  if (!key || !subject || !body_text) {
    throw new Error("Betreff und Text sind Pflichtfelder.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("email_templates")
    .update({
      subject,
      body_text,
      body_html: body_html || null,
    })
    .eq("key", key);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings/email-templates");
  revalidatePath("/admin/settings/email");
}

export async function loadDefaultMailSignatureSettingsAction() {
  await requireAdmin();
  const signatures = await listMailSignatureOptions();
  const defaultSignatureId = await getDefaultMailSignatureId();
  return { signatures, defaultSignatureId };
}

export async function saveDefaultMailSignatureIdAction(signatureId: string) {
  await requireAdmin();
  const trimmed = signatureId.trim();
  if (!trimmed) throw new Error("Bitte eine Signatur auswählen.");
  const options = await listMailSignatureOptions();
  if (!options.some((s) => s.id === trimmed)) {
    throw new Error("Unbekannte Signatur.");
  }
  await setDefaultMailSignatureId(trimmed);
  revalidatePath("/admin/settings/email-templates");
}
