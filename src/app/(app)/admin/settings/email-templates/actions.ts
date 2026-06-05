"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EmailTemplateKey } from "@/lib/email/template-keys";
import {
  getDefaultMailSignatureId,
  setDefaultMailSignatureId,
} from "@/lib/email/default-mail-signature";
import { CLUB_SIGNATURE_ID } from "@/lib/email/signatures";

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
  const defaultSignatureId = await getDefaultMailSignatureId();
  return { defaultSignatureId };
}

export async function saveDefaultMailSignatureIdAction() {
  await requireAdmin();
  await setDefaultMailSignatureId(CLUB_SIGNATURE_ID);
  revalidatePath("/admin/settings/email-templates");
}

export async function loadBirthdayTemplatesAction() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("birthday_greeting_templates")
    .select("id,title_template,body_template,sort_order,is_active")
    .order("sort_order", { ascending: true });
  if (error) {
    if (/birthday_greeting_templates|does not exist/i.test(error.message)) {
      return { rows: [], tableMissing: true as const };
    }
    throw new Error(error.message);
  }
  return { rows: data ?? [], tableMissing: false as const };
}

export async function saveBirthdayTemplateAction(input: {
  id: string;
  title_template: string;
  body_template: string;
  is_active: boolean;
}) {
  await requireAdmin();
  const title = input.title_template.trim();
  const body = input.body_template.trim();
  if (!title || !body) throw new Error("Titel und Text sind Pflichtfelder.");

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("birthday_greeting_templates")
    .update({
      title_template: title,
      body_template: body,
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings/email-templates");
}

export async function createBirthdayTemplateAction(input: {
  title_template: string;
  body_template: string;
}) {
  await requireAdmin();
  const title = input.title_template.trim();
  const body = input.body_template.trim();
  if (!title || !body) throw new Error("Titel und Text sind Pflichtfelder.");

  const admin = createSupabaseAdminClient();
  const { data: maxRow } = await admin
    .from("birthday_greeting_templates")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await admin
    .from("birthday_greeting_templates")
    .insert({
      title_template: title,
      body_template: body,
      sort_order: nextOrder,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings/email-templates");
  return { id: data?.id as string };
}

export async function deleteBirthdayTemplateAction(id: string) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { count } = await admin
    .from("birthday_greeting_templates")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  const { data: row } = await admin
    .from("birthday_greeting_templates")
    .select("is_active")
    .eq("id", id)
    .maybeSingle();
  if ((count ?? 0) <= 1 && row?.is_active) {
    throw new Error("Mindestens eine aktive Geburtstagsvorlage muss bleiben.");
  }
  const { error } = await admin.from("birthday_greeting_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings/email-templates");
}
