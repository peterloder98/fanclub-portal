/**
 * Frischen Host-Link an Anni senden (ohne Mitglieder-Login).
 *
 * Usage:
 *   EMAIL_OUTBOUND_MODE=live npx --yes tsx --env-file=.env.local scripts/resend-anni-host-link.ts
 */
import { createClient } from "@supabase/supabase-js";
import { sendAnniHostLinkEmail } from "../src/lib/live/invites";
import { generateLiveHostToken, liveHostUrl } from "../src/lib/live/types";
import { getOutboundEmailMode } from "../src/lib/email/outbound-policy";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

async function main() {
  if (getOutboundEmailMode() !== "live") {
    console.error("Abbruch: EMAIL_OUTBOUND_MODE=live erforderlich.");
    process.exit(1);
  }

  const { data: session, error } = await admin
    .from("live_sessions")
    .select("id,slug,title,starts_at,ends_at,join_opens_at,status")
    .in("status", ["scheduled", "live"])
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!session) {
    console.error("Keine geplante/live Session gefunden.");
    process.exit(1);
  }

  const { token, hash } = generateLiveHostToken();
  const { error: updErr } = await admin
    .from("live_sessions")
    .update({ host_token_hash: hash, updated_at: new Date().toISOString() })
    .eq("id", session.id);
  if (updErr) throw new Error(updErr.message);

  const hostUrl = liveHostUrl(token);
  console.log(`Session: ${session.title}`);
  console.log(`Host-URL:\n${hostUrl}`);

  const result = await sendAnniHostLinkEmail({ session, hostUrl });
  if (!result.ok) {
    console.error("E-Mail an Anni fehlgeschlagen — Host-URL oben per WhatsApp schicken.");
    process.exit(1);
  }
  console.log("✓ Host-Link-Mail an Anni gesendet.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
