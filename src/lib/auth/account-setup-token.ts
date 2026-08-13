import { createHash, randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Gültigkeit neuer Setup-Links (14 Tage). */
export const ACCOUNT_SETUP_TOKEN_TTL_DAYS = 14;

export function hashAccountSetupToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateAccountSetupTokenPlain(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashAccountSetupToken(token) };
}

function appBaseUrl(): string {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
}

export function buildAccountSetupUrl(plainToken: string, baseUrl?: string): string {
  const base = (baseUrl ?? appBaseUrl()).replace(/\/$/, "");
  if (!base) throw new Error("APP_BASE_URL / NEXT_PUBLIC_APP_URL fehlt.");
  return `${base}/setup-account?setup_token=${encodeURIComponent(plainToken)}`;
}

async function resolveUserId(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: { userId?: string; email: string },
): Promise<string> {
  if (input.userId?.trim()) return input.userId.trim();

  const email = input.email.trim().toLowerCase();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile?.id) throw new Error(`Kein Profil für ${email}.`);
  return profile.id;
}

/**
 * Erzeugt einen neuen Setup-Token und invalidiert ältere offene Tokens desselben Users.
 * Gibt die fertige Setup-URL zurück (Klartext-Token nur hier, Hash in DB).
 */
export async function rotateAccountSetupToken(input: {
  email: string;
  userId?: string;
  ttlDays?: number;
}): Promise<{ setupUrl: string; userId: string; expiresAt: string }> {
  const admin = createSupabaseAdminClient();
  const userId = await resolveUserId(admin, input);
  const ttlDays = input.ttlDays ?? ACCOUNT_SETUP_TOKEN_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000).toISOString();
  const { token, hash } = generateAccountSetupTokenPlain();
  const nowIso = new Date().toISOString();

  const { error: revokeErr } = await admin
    .from("account_setup_tokens")
    .update({ consumed_at: nowIso })
    .eq("user_id", userId)
    .is("consumed_at", null);
  if (revokeErr && !/does not exist|schema cache/i.test(revokeErr.message)) {
    throw new Error(revokeErr.message);
  }
  if (revokeErr && /does not exist|schema cache/i.test(revokeErr.message)) {
    throw new Error(
      "Tabelle account_setup_tokens fehlt — Migration 145_account_setup_tokens.sql ausführen.",
    );
  }

  const { error: insertErr } = await admin.from("account_setup_tokens").insert({
    user_id: userId,
    token_hash: hash,
    expires_at: expiresAt,
  });
  if (insertErr) throw new Error(insertErr.message);

  return {
    setupUrl: buildAccountSetupUrl(token),
    userId,
    expiresAt,
  };
}

export type AccountSetupTokenRow = {
  id: string;
  user_id: string;
  expires_at: string;
  consumed_at: string | null;
};

/**
 * Prüft Klartext-Token (noch gültig, nicht verbraucht). Verbraucht ihn nicht.
 */
export async function lookupValidAccountSetupToken(
  plainToken: string,
): Promise<
  | { ok: true; row: AccountSetupTokenRow; email: string }
  | { ok: false; reason: "invalid" | "expired" | "consumed" | "missing_table" }
> {
  const trimmed = plainToken.trim();
  if (!trimmed || trimmed.length < 20) return { ok: false, reason: "invalid" };

  const admin = createSupabaseAdminClient();
  const hash = hashAccountSetupToken(trimmed);
  const { data, error } = await admin
    .from("account_setup_tokens")
    .select("id,user_id,expires_at,consumed_at")
    .eq("token_hash", hash)
    .maybeSingle();

  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) {
      return { ok: false, reason: "missing_table" };
    }
    console.error("[account-setup-token] lookup:", error.message);
    return { ok: false, reason: "invalid" };
  }
  if (!data) return { ok: false, reason: "invalid" };
  if (data.consumed_at) return { ok: false, reason: "consumed" };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const { data: authUser, error: userErr } = await admin.auth.admin.getUserById(
    data.user_id,
  );
  if (userErr || !authUser.user?.email) {
    return { ok: false, reason: "invalid" };
  }

  return {
    ok: true,
    row: data as AccountSetupTokenRow,
    email: authUser.user.email,
  };
}

/** Markiert alle offenen Tokens des Users als verbraucht (nach Passwort-Setup). */
export async function consumeAccountSetupTokensForUser(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("account_setup_tokens")
    .update({ consumed_at: nowIso })
    .eq("user_id", userId)
    .is("consumed_at", null);
  if (error && !/does not exist|schema cache/i.test(error.message)) {
    console.error("[account-setup-token] consume:", error.message);
  }
}
