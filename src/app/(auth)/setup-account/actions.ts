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
 * Nach erfolgreichem verifyOtp: Setup-Claim setzen, damit zweiter Klick / Reload
 * auch ohne gültigen Token weitergeht.
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

  const claim = user ? null : await readSetupClaim();
  const userId = user?.id ?? claim?.userId;
  if (!userId) {
    return {
      ok: false,
      error:
        "Sitzung abgelaufen. Bitte den Link aus der neuesten E-Mail öffnen oder unter „Passwort vergessen“ einen neuen Link anfordern.",
    };
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
      error: "Geburtsdatum stimmt nicht. Bitte erneut prüfen.",
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

  await clearSetupClaim();
  return { ok: true };
}
