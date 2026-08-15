"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

const schema = z.object({
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

/** Club-Token einlösen (wiederverwendbar bis Passwort gesetzt). */
export async function redeemPasswordResetToken(plainToken: string): Promise<
  { ok: true; email: string } | { ok: false; error: string }
> {
  const result = await lookupValidAccountSetupToken(plainToken);
  if (!result.ok) {
    if (result.reason === "consumed") {
      return {
        ok: false,
        error:
          "Dieser Link wurde bereits genutzt (Passwort ist gesetzt). Bitte melde dich an oder fordere unter „Passwort vergessen“ einen neuen Link an.",
      };
    }
    if (result.reason === "expired") {
      return {
        ok: false,
        error:
          "Dieser Link ist abgelaufen. Bitte unter „Passwort vergessen“ einen neuen Link anfordern.",
      };
    }
    if (result.reason === "missing_table") {
      return {
        ok: false,
        error:
          "Passwort-Reset vorübergehend nicht möglich. Bitte später erneut versuchen oder den Vorstand kontaktieren.",
      };
    }
    return {
      ok: false,
      error:
        "Ungültiger Link. Bitte die neueste E-Mail nutzen oder unter „Passwort vergessen“ einen neuen Link anfordern.",
    };
  }

  await writeSetupClaim(result.row.user_id, result.email);
  return { ok: true, email: result.email };
}

export async function getClaimedPasswordResetSession(): Promise<
  { ok: true; email: string; userId: string } | { ok: false }
> {
  const claim = await readSetupClaim();
  if (!claim) return { ok: false };
  return { ok: true, email: claim.email, userId: claim.userId };
}

export async function completePasswordReset(input: {
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
    console.warn("[reset-password] Session-User weicht vom Setup-Claim ab; nutze Claim.", {
      sessionUserId: user.id,
      claimUserId: claim.userId,
    });
  }

  const admin = createSupabaseAdminClient();
  const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
    password: parsed.data.password,
  });
  if (pwErr) return { ok: false, error: pwErr.message };

  await consumeAccountSetupTokensForUser(userId);
  await clearSetupClaim();
  return { ok: true };
}
