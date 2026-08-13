import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_MEMBER_EMAIL_PREFS,
  MEMBER_EMAIL_PREF_KEYS,
  columnForEmailPref,
  normalizeMemberEmailPrefs,
  prefsSelectColumns,
  type MemberEmailPrefs,
} from "@/lib/email/member-email-prefs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(prefsSelectColumns())
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    if (/email_pref_|does not exist/i.test(error.message)) {
      return NextResponse.json({ prefs: DEFAULT_MEMBER_EMAIL_PREFS });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const prefs = normalizeMemberEmailPrefs(profile as Record<string, boolean | null> | null);
  return NextResponse.json({ prefs });
}

const bodySchema = z.object({
  prefs: z.object({
    new_giveaway: z.boolean(),
    new_poll: z.boolean(),
    new_event: z.boolean(),
    meeting_reminders: z.boolean(),
    live: z.boolean(),
    app_activity: z.boolean(),
  }),
});

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let prefs: MemberEmailPrefs;
  try {
    prefs = bodySchema.parse(await req.json()).prefs;
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const update: Record<string, boolean> = {};
  for (const key of MEMBER_EMAIL_PREF_KEYS) {
    update[columnForEmailPref(key)] = prefs[key];
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) {
    if (/email_pref_|does not exist/i.test(error.message)) {
      return NextResponse.json(
        { error: "E-Mail-Einstellungen sind noch nicht freigeschaltet. Bitte später erneut versuchen." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prefs });
}
