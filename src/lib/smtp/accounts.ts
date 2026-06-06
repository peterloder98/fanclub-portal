import { DEFAULT_MAIL_DISPLAY_NAME } from "@/lib/smtp/display-name";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptSmtpPassword, encryptSmtpPassword } from "@/lib/smtp/crypto";
import { formatSmtpError } from "@/lib/smtp/errors";
import { createTransportFromCredentials } from "@/lib/smtp/transport";
import type { SmtpAccountInput, SmtpAccountPublic, SmtpEncryption } from "@/lib/smtp/types";

function rowToPublic(row: Record<string, unknown>): SmtpAccountPublic {
  return {
    id: String(row.id),
    server: String(row.server),
    port: Number(row.port),
    encryption: row.encryption as SmtpEncryption,
    email: String(row.email),
    display_name: (row.display_name as string) ?? null,
    reply_to: (row.reply_to as string) ?? null,
    is_default: Boolean(row.is_default),
    artistflow_id: (row.artistflow_id as string) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listSmtpAccounts(): Promise<SmtpAccountPublic[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("smtp_accounts")
    .select(
      "id,server,port,encryption,email,display_name,reply_to,is_default,artistflow_id,created_at,updated_at",
    )
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToPublic(r as Record<string, unknown>));
}

async function clearOtherDefaults(admin: ReturnType<typeof createSupabaseAdminClient>, exceptId?: string) {
  let q = admin.from("smtp_accounts").update({ is_default: false }).eq("is_default", true);
  if (exceptId) q = q.neq("id", exceptId);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

function decryptAccountPassword(ciphertext: string) {
  try {
    return decryptSmtpPassword(ciphertext);
  } catch (e) {
    throw new Error(formatSmtpError(e));
  }
}

async function loadAccountPassword(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  row: Record<string, unknown>,
) {
  try {
    return decryptAccountPassword(String(row.password_ciphertext));
  } catch {
    await repairDefaultSmtpPasswordFromEnv();
    const { data: refreshed, error } = await admin
      .from("smtp_accounts")
      .select("password_ciphertext")
      .eq("id", String(row.id))
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!refreshed) throw new Error("SMTP-Konto nicht gefunden.");
    return decryptAccountPassword(String(refreshed.password_ciphertext));
  }
}

export async function getDefaultSmtpAccountWithPassword() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("smtp_accounts")
    .select("*")
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const password = await loadAccountPassword(admin, data as Record<string, unknown>);
  return {
    public: rowToPublic(data as Record<string, unknown>),
    password,
  };
}

export async function getSmtpAccountWithPassword(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("smtp_accounts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const password = await loadAccountPassword(admin, data as Record<string, unknown>);
  return {
    public: rowToPublic(data as Record<string, unknown>),
    password,
  };
}

export async function createSmtpAccount(input: SmtpAccountInput) {
  if (!input.password?.trim()) throw new Error("Passwort ist erforderlich.");
  const admin = createSupabaseAdminClient();
  if (input.is_default) await clearOtherDefaults(admin);

  const { data, error } = await admin
    .from("smtp_accounts")
    .insert({
      server: input.server.trim(),
      port: input.port,
      encryption: input.encryption,
      email: input.email.trim(),
      password_ciphertext: encryptSmtpPassword(input.password.trim()),
      display_name: input.display_name?.trim() || null,
      reply_to: input.reply_to?.trim() || null,
      is_default: Boolean(input.is_default),
      artistflow_id: input.artistflow_id?.trim() || null,
    })
    .select(
      "id,server,port,encryption,email,display_name,reply_to,is_default,artistflow_id,created_at,updated_at",
    )
    .single();
  if (error) throw new Error(error.message);

  const accounts = await listSmtpAccounts();
  if (accounts.length === 1) {
    await setDefaultSmtpAccount(data.id);
  }

  return rowToPublic(data as Record<string, unknown>);
}

export async function updateSmtpAccount(id: string, input: SmtpAccountInput) {
  const admin = createSupabaseAdminClient();
  if (input.is_default) await clearOtherDefaults(admin, id);

  const patch: Record<string, unknown> = {
    server: input.server.trim(),
    port: input.port,
    encryption: input.encryption,
    email: input.email.trim(),
    display_name: input.display_name?.trim() || null,
    reply_to: input.reply_to?.trim() || null,
    is_default: Boolean(input.is_default),
    artistflow_id: input.artistflow_id?.trim() || null,
  };
  if (input.password?.trim()) {
    patch.password_ciphertext = encryptSmtpPassword(input.password.trim());
  }

  const { data, error } = await admin
    .from("smtp_accounts")
    .update(patch)
    .eq("id", id)
    .select(
      "id,server,port,encryption,email,display_name,reply_to,is_default,artistflow_id,created_at,updated_at",
    )
    .single();
  if (error) throw new Error(error.message);
  return rowToPublic(data as Record<string, unknown>);
}

export async function deleteSmtpAccount(id: string) {
  const admin = createSupabaseAdminClient();
  const { data: target } = await admin
    .from("smtp_accounts")
    .select("id,is_default")
    .eq("id", id)
    .maybeSingle();
  if (!target) throw new Error("Konto nicht gefunden.");

  const { count } = await admin
    .from("smtp_accounts")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) {
    throw new Error("Das letzte SMTP-Konto kann nicht gelöscht werden.");
  }

  const { error } = await admin.from("smtp_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (target.is_default) {
    const { data: next } = await admin
      .from("smtp_accounts")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next?.id) await setDefaultSmtpAccount(next.id);
  }
}

export async function setDefaultSmtpAccount(id: string) {
  const admin = createSupabaseAdminClient();
  await clearOtherDefaults(admin, id);
  const { error } = await admin.from("smtp_accounts").update({ is_default: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function testSmtpConnection(
  id?: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  try {
    await repairDefaultSmtpPasswordFromEnv();
    const creds = id
      ? await getSmtpAccountWithPassword(id)
      : await getDefaultSmtpAccountWithPassword();
    if (!creds) {
      return {
        ok: false,
        error:
          "Kein SMTP-Konto gefunden. Lege ein Konto an oder setze SMTP_SEED_* in Vercel.",
      };
    }

    const transport = createTransportFromCredentials({
      server: creds.public.server,
      port: creds.public.port,
      encryption: creds.public.encryption,
      email: creds.public.email,
      password: creds.password,
    });
    await transport.verify();
    transport.close();
    return { ok: true, email: creds.public.email };
  } catch (e) {
    return { ok: false, error: formatSmtpError(e) };
  }
}

/** Passwort mit aktuellem SMTP_SECRET neu setzen, wenn Entschlüsselung fehlschlägt (z. B. Vercel-Deploy). */
export async function repairDefaultSmtpPasswordFromEnv() {
  const email = process.env.SMTP_SEED_EMAIL?.trim();
  const password = process.env.SMTP_SEED_PASSWORD?.trim();
  if (!email || !password) return { repaired: false as const, reason: "env_incomplete" as const };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("smtp_accounts")
    .select("id,email,password_ciphertext")
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.email !== email) return { repaired: false as const, reason: "no_matching_account" as const };

  try {
    decryptSmtpPassword(data.password_ciphertext);
    return { repaired: false as const, ok: true as const };
  } catch {
    const { error: upErr } = await admin
      .from("smtp_accounts")
      .update({ password_ciphertext: encryptSmtpPassword(password) })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    return { repaired: true as const };
  }
}

export async function seedSmtpFromEnvIfEmpty() {
  const existing = await listSmtpAccounts();
  if (existing.length > 0) return { seeded: false as const, count: existing.length };

  const email = process.env.SMTP_SEED_EMAIL?.trim();
  const password = process.env.SMTP_SEED_PASSWORD?.trim();
  const server = process.env.SMTP_SEED_SERVER?.trim();
  if (!email || !password || !server) {
    return { seeded: false as const, count: 0, reason: "env_incomplete" as const };
  }

  const encryption = (process.env.SMTP_SEED_ENCRYPTION?.trim().toUpperCase() ||
    "SSL") as SmtpEncryption;

  await createSmtpAccount({
    server,
    port: Number(process.env.SMTP_SEED_PORT ?? "465"),
    encryption,
    email,
    password,
    display_name:
      process.env.SMTP_SEED_DISPLAY_NAME?.trim() || DEFAULT_MAIL_DISPLAY_NAME,
    reply_to: process.env.SMTP_SEED_REPLY_TO?.trim() || email,
    is_default: process.env.SMTP_SEED_IS_DEFAULT !== "false",
    artistflow_id: process.env.SMTP_SEED_ARTISTFLOW_ID?.trim() || null,
  });

  return { seeded: true as const, count: 1 };
}
