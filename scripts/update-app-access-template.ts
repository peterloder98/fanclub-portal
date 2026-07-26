/**
 * Aktualisiert die app_access_setup E-Mail-Vorlage in Supabase.
 *
 * Usage:
 *   npx --yes tsx --env-file=.env.local scripts/update-app-access-template.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

const body_text = `{{salutation}},

wir freuen uns, dass du im Anni Perka Fanclub dabei bist und senden dir heute den Link zum Einrichten deines Zugangs zur neuen Fanclub App.

1. Bitte den folgenden Link klicken:
{{setup_url}}

2. Bestätige deine Identität durch Eingabe deines Geburtsdatums und vergebe dein Wunschpasswort. Dein Benutzername ist deine E-Mail-Adresse. Bitte speichere dir beides unbedingt ab!

3. Die neuen Features in der App austesten und mit deinen Fanclub-Freunden chatten oder austauschen!

Viel Spaß und bis ganz bald.`;

const body_html = `<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">{{salutation}},</p>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">wir freuen uns, dass du im Anni Perka Fanclub dabei bist und senden dir heute den Link zum Einrichten deines Zugangs zur neuen Fanclub App.</p>
<ol style="margin:0 0 1.25em;padding-left:1.25em;font-size:15px;line-height:1.6;color:#1e293b">
  <li style="margin-bottom:0.75em"><strong>Bitte den folgenden Button klicken:</strong><br>
    <a href="{{setup_url}}" style="display:inline-block;margin-top:8px;padding:12px 18px;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600">Zugang hier einrichten</a>
  </li>
  <li style="margin-bottom:0.75em"><strong>Bestätige deine Identität</strong> durch Eingabe deines Geburtsdatums und vergebe dein Wunschpasswort. Dein Benutzername ist deine E-Mail-Adresse. Bitte speichere dir beides unbedingt ab!</li>
  <li><strong>Die neuen Features in der App austesten</strong> und mit deinen Fanclub-Freunden chatten oder austauschen!</li>
</ol>
<p style="margin:0 0 1em;font-size:15px;line-height:1.55;color:#1e293b">Viel Spaß und bis ganz bald.</p>`;

async function main() {
  const { error } = await admin.from("email_templates").upsert(
    {
      key: "app_access_setup",
      name: "App-Zugang einrichten",
      subject: "Dein Zugang zur Anni Perka Fanclub App",
      body_text,
      body_html,
      description:
        "Einladungsmail mit Button zum Einrichten von Geburtsdatum-Bestätigung und Passwort",
    },
    { onConflict: "key" },
  );
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log("Template app_access_setup updated.");

  const { data: nicole } = await admin
    .from("profiles")
    .select("first_name,gender,email")
    .ilike("first_name", "Nicole")
    .ilike("last_name", "Ness")
    .maybeSingle();
  console.log("Nicole:", nicole);

  const { data: settings } = await admin
    .from("app_settings")
    .select("key,value")
    .in("key", [
      "club_signature_text",
      "club_signature_image_path",
      "default_mail_signature_id",
    ]);
  console.log("Signature settings:", settings);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
