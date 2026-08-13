import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendAppAccessSetupEmail } from "@/lib/email/app-access-setup";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";

/** Soft-Launch: eigener Versand über Club-SMTP — nicht Supabase /recover. */
export const FORGOT_PASSWORD_EMAIL_COOLDOWN_SECONDS = 10 * 60;
export const FORGOT_PASSWORD_IP_MAX_PER_HOUR = 20;

export const FORGOT_PASSWORD_RATE_LIMIT_DE =
  "Zu viele Versuche. Bitte warte etwa 10 Minuten und versuche es dann erneut — oder melde dich beim Vorstand.";

export const FORGOT_PASSWORD_OK_DE =
  "Wenn die E-Mail bei uns hinterlegt ist, wurde ein neuer Einrichtungs-Link gesendet. Nutze nur die neueste Mail, öffne den Link einmal und bleibe im selben Browser.";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Prüft jüngste erfolgreiche App-Zugang-Mails an diese Adresse (Club-SMTP-Log).
 */
export async function recentSetupSendCount(
  email: string,
  withinSeconds: number,
): Promise<number> {
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - withinSeconds * 1000).toISOString();
  const { count, error } = await admin
    .from("email_send_log")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .eq("template_key", EMAIL_TEMPLATE_KEYS.appAccessSetup)
    .ilike("to_address", normalizeEmail(email))
    .gte("created_at", since);

  if (error) {
    if (/email_send_log|does not exist/i.test(error.message)) return 0;
    console.error("[forgot-password] rate-check:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function recentForgotPasswordIpCount(
  ip: string,
  withinSeconds = 60 * 60,
): Promise<number> {
  if (!ip || ip === "unknown") return 0;
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - withinSeconds * 1000).toISOString();
  const { count, error } = await admin
    .from("email_send_log")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .eq("template_key", EMAIL_TEMPLATE_KEYS.appAccessSetup)
    .contains("context", { source: "forgot_password", client_ip: ip })
    .gte("created_at", since);

  if (error) {
    // contains/json filter can fail on older schemas — fail open for IP only
    if (/email_send_log|does not exist|operator|contains/i.test(error.message)) {
      return 0;
    }
    console.error("[forgot-password] ip-rate-check:", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Sendet frischen Setup-/Recovery-Link über Club-SMTP (bypass Supabase Auth-Mail-Limit).
 * Antwort verrät nicht, ob die Adresse existiert.
 */
export async function requestForgotPasswordViaSmtp(input: {
  email: string;
  clientIp?: string | null;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const email = normalizeEmail(input.email);
  if (!email.includes("@")) {
    return { ok: false, error: "Bitte eine gültige E-Mail eingeben." };
  }

  const recent = await recentSetupSendCount(
    email,
    FORGOT_PASSWORD_EMAIL_COOLDOWN_SECONDS,
  );
  if (recent > 0) {
    return { ok: false, error: FORGOT_PASSWORD_RATE_LIMIT_DE };
  }

  const ip = (input.clientIp ?? "").trim() || "unknown";
  if (ip !== "unknown") {
    const ipCount = await recentForgotPasswordIpCount(ip);
    if (ipCount >= FORGOT_PASSWORD_IP_MAX_PER_HOUR) {
      return { ok: false, error: FORGOT_PASSWORD_RATE_LIMIT_DE };
    }
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id,email,first_name,gender")
    .ilike("email", email)
    .maybeSingle();

  // Keine Enumeration: unbekannte Adresse = Erfolg vortäuschen
  if (!profile?.email) {
    return { ok: true, message: FORGOT_PASSWORD_OK_DE };
  }

  try {
    const result = await sendAppAccessSetupEmail({
      email: profile.email,
      firstName: profile.first_name?.trim() || "Fan",
      gender: profile.gender,
      userId: profile.id,
      logContext: {
        source: "forgot_password",
        client_ip: ip,
      },
    });

    if (!result.ok) {
      if ("skipped" in result && result.skipped) {
        console.error("[forgot-password] skipped:", result.reason);
        return {
          ok: false,
          error: "E-Mail konnte gerade nicht gesendet werden. Bitte später erneut versuchen.",
        };
      }
      if ("error" in result) {
        console.error("[forgot-password] send:", result.error);
        return {
          ok: false,
          error: "E-Mail konnte gerade nicht gesendet werden. Bitte später erneut versuchen.",
        };
      }
    }
  } catch (e) {
    console.error("[forgot-password]", e);
    return {
      ok: false,
      error: "E-Mail konnte gerade nicht gesendet werden. Bitte später erneut versuchen.",
    };
  }

  return { ok: true, message: FORGOT_PASSWORD_OK_DE };
}
