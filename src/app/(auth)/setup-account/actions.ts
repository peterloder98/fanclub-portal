"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeBirthdateIso } from "@/lib/person/birthdate";

const schema = z.object({
  birthdate: z.string().min(1, "Geburtsdatum ist Pflicht."),
  password: z.string().min(8, "Passwort mindestens 8 Zeichen."),
  passwordConfirm: z.string().min(1),
});

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
  if (!user) {
    return {
      ok: false,
      error: "Link ungültig oder abgelaufen. Bitte die E-Mail erneut öffnen.",
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
    .eq("id", user.id)
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

  const { error: pwErr } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.password,
  });
  if (pwErr) return { ok: false, error: pwErr.message };

  return { ok: true };
}
