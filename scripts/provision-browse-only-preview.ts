/**
 * Legt den stillen Vorschau-Zugang an (idempotent).
 *   npx --yes tsx --env-file=.env.local scripts/provision-browse-only-preview.ts
 */
import { createClient } from "@supabase/supabase-js";
import { BROWSE_ONLY_PROFILE_IDS } from "../src/lib/members/hidden";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const USER_ID = [...BROWSE_ONLY_PROFILE_IDS][0]!;
const EMAIL = "portal.vorschau@anniperka.de";
const PASSWORD =
  process.env.PREVIEW_PASSWORD?.trim() ||
  `Blick-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}!`;
const now = new Date().toISOString();

async function main() {
  const existing = await admin.auth.admin.getUserById(USER_ID);
  if (existing.error && !/not found|does not exist/i.test(existing.error.message)) {
    // continue — create below
  }

  if (existing.data?.user) {
    const { error: updErr } = await admin.auth.admin.updateUserById(USER_ID, {
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: "member",
        username: "portalvorschau",
        first_name: "Mira",
        last_name: "Kellner",
      },
    });
    if (updErr) {
      console.error("Auth-Update:", updErr.message);
      process.exit(1);
    }
    console.log("Auth-User aktualisiert:", USER_ID);
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      id: USER_ID,
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: "member",
        username: "portalvorschau",
        first_name: "Mira",
        last_name: "Kellner",
      },
    });
    if (createErr || !created.user) {
      console.error("Auth-Create:", createErr?.message ?? "kein User");
      process.exit(1);
    }
    console.log("Auth-User angelegt:", created.user.id);
  }

  const profilePayload: Record<string, unknown> = {
    id: USER_ID,
    role: "member",
    username: "portalvorschau",
    email: EMAIL,
    first_name: "Mira",
    last_name: "Kellner",
    gender: "w",
    country: "DE",
    membership_number: null,
  };

  const extras: Record<string, unknown>[] = [
    { browse_only: true, is_hidden: true, app_registration_status: "open", intro_onboarding_dismissed_at: now, community_rules_accepted_at: now, last_app_active_at: null, app_registered_at: null },
    { is_hidden: true, app_registration_status: "open", intro_onboarding_dismissed_at: now, community_rules_accepted_at: now, last_app_active_at: null, app_registered_at: null },
    { app_registration_status: "open", intro_onboarding_dismissed_at: now, community_rules_accepted_at: now },
    { intro_onboarding_dismissed_at: now, community_rules_accepted_at: now },
    {},
  ];

  let profileErr: { message: string } | null = { message: "no attempt" };
  for (const extra of extras) {
    const retry = await admin.from("profiles").upsert(
      { ...profilePayload, ...extra },
      { onConflict: "id" },
    );
    profileErr = retry.error;
    if (!profileErr) {
      console.log("Profil gespeichert", Object.keys(extra).length ? `mit ${Object.keys(extra).join(",")}` : "ohne Extra-Spalten");
      break;
    }
    console.warn("Profil-Versuch:", profileErr.message);
  }
  if (profileErr) {
    console.error("Profil:", profileErr.message);
    process.exit(1);
  }

  const { data: mem } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", USER_ID)
    .maybeSingle();
  if (!mem) {
    const { error: memErr } = await admin.from("memberships").insert({
      user_id: USER_ID,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: "2099-12-31",
      fee_cents: 0,
      status: "active",
    });
    if (memErr) {
      console.error("Mitgliedschaft:", memErr.message);
      process.exit(1);
    }
  }

  console.log("Fertig.");
  console.log(`Login: ${EMAIL}`);
  console.log(`Passwort: ${PASSWORD}`);
  console.log(`User-ID: ${USER_ID}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
