import { getDefaultSmtpAccountWithPassword, listSmtpAccounts } from "@/lib/smtp/accounts";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Offizielle Fanclub-Adresse für Admin-E-Mails (nicht die privaten Vorstands-Mails).
 * Reihenfolge: FANCLUB_OFFICIAL_EMAIL / ADMIN_NOTIFY_EMAIL → SMTP_SEED_EMAIL → Default-SMTP.
 */
export async function resolveOfficialFanclubEmail(): Promise<string | null> {
  const fromEnv = (
    process.env.FANCLUB_OFFICIAL_EMAIL?.trim() ||
    process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
    process.env.SMTP_SEED_EMAIL?.trim() ||
    ""
  );
  if (fromEnv) return normalizeEmail(fromEnv);

  try {
    const def = await getDefaultSmtpAccountWithPassword();
    if (def?.public.email?.trim()) return normalizeEmail(def.public.email);
  } catch {
    /* ignore */
  }

  try {
    const accounts = await listSmtpAccounts();
    const withEmail = accounts.find((a) => a.email?.trim());
    if (withEmail?.email?.trim()) return normalizeEmail(withEmail.email);
  } catch {
    /* ignore */
  }

  return null;
}
