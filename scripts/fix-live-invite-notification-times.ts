/**
 * Korrigiert gespeicherte Live-Einladungs-Benachrichtigungen:
 * UTC-formatierte „19:00“ → Berlin „21:00“ für die Montag-Session.
 *
 *   npx --yes tsx --env-file=.env.local scripts/fix-live-invite-notification-times.ts
 *   npx --yes tsx --env-file=.env.local scripts/fix-live-invite-notification-times.ts --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { formatBerlinDateTimeLong } from "../src/lib/datetime/berlin";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key);
const dryRun = process.argv.includes("--dry-run");

const WRONG_SNIPPET = "19:00";
const MONDAY_HINT = "24. August 2026";

async function main() {
  const { data: sessions, error: sErr } = await admin
    .from("live_sessions")
    .select("id,slug,title,starts_at,status,invites_sent_at")
    .gte("starts_at", "2026-08-23T00:00:00.000Z")
    .lte("starts_at", "2026-08-25T23:59:59.999Z")
    .order("starts_at");
  if (sErr) throw sErr;

  console.log("=== Live-Sessions 23.–25.08.2026 ===");
  for (const s of sessions ?? []) {
    console.log({
      id: s.id,
      title: s.title,
      starts_at: s.starts_at,
      berlin: formatBerlinDateTimeLong(s.starts_at),
      invites_sent_at: s.invites_sent_at,
    });
  }

  const monday =
    (sessions ?? []).find((s) => {
      const label = formatBerlinDateTimeLong(s.starts_at);
      return label.includes(MONDAY_HINT) && /anni/i.test(s.title);
    }) ??
    (sessions ?? []).find((s) => formatBerlinDateTimeLong(s.starts_at).includes(MONDAY_HINT));

  if (!monday) {
    throw new Error("Keine Montag-Session (24. August 2026) gefunden.");
  }

  const correctDate = formatBerlinDateTimeLong(monday.starts_at);
  console.log("\nZiel-Session:", {
    id: monday.id,
    title: monday.title,
    starts_at: monday.starts_at,
    correctDate,
  });

  if (!correctDate.includes("21:00")) {
    console.warn(
      "Warnung: formatierte Berlin-Zeit enthält kein 21:00 — starts_at prüfen:",
      monday.starts_at,
      "→",
      correctDate,
    );
  }

  // Alle live_session_invite mit 19:00 (und idealerweise dieser Montag-Session)
  const { data: notes, error: nErr } = await admin
    .from("user_notifications")
    .select("id,user_id,kind,title,body,link_url,created_at,metadata,read_at")
    .eq("kind", "live_session_invite")
    .ilike("body", `%${WRONG_SNIPPET}%`)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (nErr) throw nErr;

  const sessionId = monday.id as string;
  const affected = (notes ?? []).filter((n) => {
    const meta = (n.metadata ?? {}) as { session_id?: string; slug?: string };
    const body = n.body ?? "";
    const forSession =
      meta.session_id === sessionId ||
      meta.slug === monday.slug ||
      body.includes(MONDAY_HINT) ||
      (n.link_url ?? "").includes(`/live/${monday.slug}`);
    return forSession && body.includes(WRONG_SNIPPET);
  });

  console.log(`\nGefunden mit „${WRONG_SNIPPET}“: ${notes?.length ?? 0}`);
  console.log(`Davon diese Montag-Session: ${affected.length}`);
  if (affected[0]) {
    console.log("Beispiel alt:", affected[0].body);
  }

  const correctBody = `${monday.title} · ${correctDate}. Bitte zusagen oder absagen.`;
  console.log("Neuer body:", correctBody);

  if (dryRun) {
    console.log("\n--dry-run: keine Updates.");
    return;
  }

  let fixed = 0;
  let failed = 0;
  for (const n of affected) {
    const nextBody = (n.body ?? "")
      .replaceAll("um 19:00", "um 21:00")
      .replaceAll("19:00", "21:00");

    // Bevorzugt kanonischen Body, falls Titel/Struktur passt
    const body =
      (n.body ?? "").includes(MONDAY_HINT) || (n.body ?? "").includes(WRONG_SNIPPET)
        ? correctBody
        : nextBody;

    const { error } = await admin
      .from("user_notifications")
      .update({ body })
      .eq("id", n.id);
    if (error) {
      console.error("Update failed", n.id, error.message);
      failed += 1;
    } else {
      fixed += 1;
    }
  }

  // Verifikation
  const { data: stillWrong, error: vErr } = await admin
    .from("user_notifications")
    .select("id")
    .eq("kind", "live_session_invite")
    .ilike("body", `%${WRONG_SNIPPET}%`)
    .limit(50);
  if (vErr) throw vErr;

  const stillThisSession = (stillWrong ?? []).length; // rough; re-check filtered below
  const { data: verify, error: v2 } = await admin
    .from("user_notifications")
    .select("id,body")
    .eq("kind", "live_session_invite")
    .contains("metadata", { session_id: sessionId })
    .limit(5);
  if (v2) {
    // metadata contains may fail depending on column type — ignore
    console.log("Verify sample via session_id filter skipped:", v2.message);
  } else {
    console.log("Verify sample:", verify?.map((v) => v.body));
  }

  console.log(`\nFertig: ${fixed} aktualisiert, ${failed} Fehler.`);
  console.log(
    `Noch live_session_invite mit „19:00“ insgesamt: ${stillThisSession}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
