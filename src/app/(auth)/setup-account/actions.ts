"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeBirthdateIso } from "@/lib/person/birthdate";
import {
  SETUP_CLAIM_COOKIE,
  SETUP_CLAIM_TTL_SECONDS,
  createSetupClaimToken,
  verifySetupClaimToken,
} from "@/lib/auth/setup-claim";
import {
  consumeAccountSetupTokensForUser,
  lookupValidAccountSetupToken,
} from "@/lib/auth/account-setup-token";
import { getAccountAccessFlowForUser } from "@/lib/auth/account-access-flow";

const schema = z.object({
  birthdate: z.string().min(1, "Geburtsdatum ist Pflicht."),
  password: z.string().min(8, "Passwort mindestens 8 Zeichen."),
  passwordConfirm: z.string().min(1),
});

async function readSetupClaim() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SETUP_CLAIM_COOKIE)?.value;
  if (!raw) return null;
  return verifySetupClaimToken(raw);
}

async function writeSetupClaim(userId: string, email: string) {
  const cookieStore = await cookies();
  const token = createSetupClaimToken(userId, email);
  cookieStore.set(SETUP_CLAIM_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SETUP_CLAIM_TTL_SECONDS,
  });
}

async function clearSetupClaim() {
  const cookieStore = await cookies();
  cookieStore.delete(SETUP_CLAIM_COOKIE);
}

/**
 * Club-Setup-Token einlösen (wiederverwendbar bis Passwort gesetzt).
 * Setzt Claim-Cookie — funktioniert auf jedem Gerät/Browser erneut.
 */
export async function redeemAccountSetupToken(plainToken: string): Promise<
  { ok: true; email: string } | { ok: false; error: string }
> {
  const result = await lookupValidAccountSetupToken(plainToken);
  if (!result.ok) {
    if (result.reason === "consumed") {
      return {
        ok: false,
        error:
          "Dieser Einrichtungs-Link wurde bereits genutzt (Passwort ist gesetzt). Bitte melde dich an oder nutze „Passwort vergessen“.",
      };
    }
    if (result.reason === "expired") {
      return {
        ok: false,
        error:
          "Dieser Einrichtungs-Link ist abgelaufen. Bitte unter „Passwort vergessen“ einen neuen Link anfordern.",
      };
    }
    if (result.reason === "missing_table") {
      return {
        ok: false,
        error:
          "Einrichtung vorübergehend nicht möglich. Bitte später erneut versuchen oder den Vorstand kontaktieren.",
      };
    }
    return {
      ok: false,
      error:
        "Ungültiger Einrichtungs-Link. Bitte die neueste E-Mail nutzen oder unter „Passwort vergessen“ einen neuen Link anfordern.",
    };
  }

  await writeSetupClaim(result.row.user_id, result.email);
  return { ok: true, email: result.email };
}

/**
 * Nach erfolgreichem verifyOtp (Legacy token_hash): Setup-Claim setzen.
 * Optional accessToken: falls Browser-Cookies noch nicht beim Server angekommen sind.
 */
export async function claimAccountSetupSession(accessToken?: string): Promise<
  { ok: true; email: string } | { ok: false; error: string }
> {
  let userId: string | null = null;
  let email: string | null = null;

  if (accessToken?.trim()) {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.getUser(accessToken.trim());
    if (!error && data.user?.id && data.user.email) {
      userId = data.user.id;
      email = data.user.email;
    }
  }

  if (!userId || !email) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    email = user?.email ?? null;
  }

  if (!userId || !email) {
    return { ok: false, error: "Keine Sitzung — bitte den Link aus der E-Mail erneut öffnen." };
  }
  await writeSetupClaim(userId, email);
  return { ok: true, email };
}

/** Für die Setup-Seite: Claim-Cookie auslesen, wenn Auth-Session fehlt. */
export async function getClaimedSetupSession(): Promise<
  { ok: true; email: string; userId: string } | { ok: false }
> {
  const claim = await readSetupClaim();
  if (!claim) return { ok: false };
  return { ok: true, email: claim.email, userId: claim.userId };
}

/** Client-fähig: bereits registriert → Passwort-Reset statt Ersteinrichtung. */
export async function resolveAccountAccessFlow(
  userId: string,
): Promise<"password_reset" | "account_setup"> {
  return getAccountAccessFlowForUser(userId);
}

export async function completeAccountSetup(input: {
  birthdate: string;
  password: string;
  passwordConfirm: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }
  if (parsed.data.password !== parsed.data.passwordConfirm) {
    return { ok: false, error: "Passwörter stimmen nicht überein." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Claim aus dem E-Mail-Link hat Vorrang vor einer evtl. fremden Browser-Session
  // (z. B. Familienmitglied auf demselben Gerät bereits angemeldet).
  const claim = await readSetupClaim();
  const userId = claim?.userId ?? user?.id ?? null;
  if (!userId) {
    return {
      ok: false,
      error:
        "Sitzung abgelaufen. Bitte den Link aus der neuesten E-Mail öffnen oder unter „Passwort vergessen“ einen neuen Link anfordern.",
    };
  }
  if (claim && user && claim.userId !== user.id) {
    // Fremde Session nicht für die Identitätsprüfung nutzen — Claim bleibt maßgeblich.
    console.warn(
      "[setup-account] Session-User weicht vom Setup-Claim ab; nutze Claim.",
      { sessionUserId: user.id, claimUserId: claim.userId },
    );
  }

  const entered = normalizeBirthdateIso(parsed.data.birthdate);
  if (!entered) {
    return {
      ok: false,
      error: "Bitte Geburtsdatum im Format TT.MM.JJJJ eingeben.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id,birthdate,email,first_name")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) return { ok: false, error: profileErr.message };
  if (!profile) return { ok: false, error: "Profil nicht gefunden." };

  const stored = normalizeBirthdateIso(profile.birthdate);
  if (!stored) {
    return {
      ok: false,
      error: "Für dein Profil ist kein Geburtsdatum hinterlegt. Bitte den Vorstand kontaktieren.",
    };
  }
  if (stored !== entered) {
    return {
      ok: false,
      error:
        "Geburtsdatum stimmt nicht mit dem Konto oben überein. Bitte TT.MM.JJJJ prüfen — und bei geteiltem Gerät den eigenen Einrichtungs-Link aus der E-Mail nutzen.",
    };
  }

  const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
    password: parsed.data.password,
  });
  if (pwErr) return { ok: false, error: pwErr.message };

  const nowIso = new Date().toISOString();
  const { error: regErr } = await admin
    .from("profiles")
    .update({
      app_registration_status: "registered",
      app_registered_at: nowIso,
      app_registration_deleted_at: null,
    })
    .eq("id", userId);
  if (regErr && !/app_registration_status|does not exist/i.test(regErr.message)) {
    console.error("[setup-account] Registrierungsstatus:", regErr.message);
  }

  await consumeAccountSetupTokensForUser(userId);
  await clearSetupClaim();
  return { ok: true };
}
