import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getDefaultSmtpAccountWithPassword, listSmtpAccounts } from "@/lib/smtp/accounts";
import { resolveOfficialFanclubEmail } from "@/lib/email/official-fanclub-email";

export type AdminNotifyRecipient = {
  email: string;
  firstName: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Empfänger für Vorstand-/Admin-Benachrichtigungen:
 * alle Admins (persönliche Mails) + SMTP-/Club-Adresse + ggf. offizielle Env-Adresse.
 * Dedupliziert.
 */
export async function listAdminNotifyRecipients(): Promise<AdminNotifyRecipient[]> {
  const admin = createSupabaseAdminClient();
  const { data: admins, error } = await admin
    .from("profiles")
    .select("email,first_name,last_name")
    .eq("role", "admin")
    .not("email", "is", null);

  if (error) {
    console.error("[email] Admin-Empfänger laden:", error.message);
  }

  const byEmail = new Map<string, AdminNotifyRecipient>();

  for (const a of admins ?? []) {
    const email = a.email?.trim();
    if (!email) continue;
    const key = normalizeEmail(email);
    byEmail.set(key, {
      email: key,
      firstName: a.first_name?.trim() || a.last_name?.trim() || "Vorstand",
    });
  }

  // SMTP-Absender-Postfach (z. B. anniperka-fanclub@web.de) — dort prüft die Leitung oft den Eingang
  try {
    const def = await getDefaultSmtpAccountWithPassword();
    const smtpEmail = def?.public.email?.trim();
    if (smtpEmail) {
      const key = normalizeEmail(smtpEmail);
      if (!byEmail.has(key)) {
        byEmail.set(key, { email: key, firstName: "Vorstand" });
      }
    }
  } catch {
    try {
      const accounts = await listSmtpAccounts();
      const withEmail = accounts.find((a) => a.email?.trim());
      if (withEmail?.email?.trim()) {
        const key = normalizeEmail(withEmail.email);
        if (!byEmail.has(key)) {
          byEmail.set(key, { email: key, firstName: "Vorstand" });
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Env-Fallback (z. B. promotion@…) falls abweichend
  try {
    const official = await resolveOfficialFanclubEmail();
    if (official) {
      const key = normalizeEmail(official);
      if (!byEmail.has(key)) {
        byEmail.set(key, { email: key, firstName: "Vorstand" });
      }
    }
  } catch {
    /* ignore */
  }

  return [...byEmail.values()];
}
