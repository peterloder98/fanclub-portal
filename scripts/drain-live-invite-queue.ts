/**
 * Pending Live-Einladungen drainen + verwaiste Queue-Mails zu gelöschten Sessions canceln.
 *
 *   npx --yes tsx --env-file=.env.local scripts/drain-live-invite-queue.ts
 *   npx --yes tsx --env-file=.env.local scripts/drain-live-invite-queue.ts --dry-run
 */
import { createSupabaseAdminClient } from "../src/lib/supabase/admin";
import {
  countPendingOutboundEmails,
  drainOutboundEmailQueue,
} from "../src/lib/email/outbound-queue";
import { cancelPendingLiveOutboundEmails } from "../src/lib/live/invites";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const admin = createSupabaseAdminClient();

  const { data: pendingRows, error: pendErr } = await admin
    .from("email_outbound_queue")
    .select("id,dedupe_key,status,template_key,created_at,to_address")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (pendErr) throw new Error(pendErr.message);

  const pending = pendingRows ?? [];
  const byTemplate = new Map<string, number>();
  const sessionIds = new Set<string>();
  for (const row of pending) {
    byTemplate.set(row.template_key, (byTemplate.get(row.template_key) ?? 0) + 1);
    const m = String(row.dedupe_key ?? "").match(
      /^live_(?:invite|reminder_no_rsvp):([^:]+):/,
    );
    if (m) sessionIds.add(m[1]);
  }

  console.log(`pending_total=${pending.length}`);
  for (const [k, n] of [...byTemplate.entries()].sort()) {
    console.log(`  template ${k}: ${n}`);
  }
  console.log(`live_session_ids_in_queue=${sessionIds.size}`);

  const existing = new Set<string>();
  if (sessionIds.size) {
    const { data: sessions, error } = await admin
      .from("live_sessions")
      .select("id,title,starts_at,status")
      .in("id", [...sessionIds]);
    if (error) throw new Error(error.message);
    for (const s of sessions ?? []) {
      existing.add(s.id);
      console.log(
        `  session ${s.id.slice(0, 8)}… status=${s.status} starts=${s.starts_at} title=${JSON.stringify(s.title)}`,
      );
    }
  }

  const orphaned = [...sessionIds].filter((id) => !existing.has(id));
  console.log(`orphaned_session_ids=${orphaned.length}`);

  if (orphaned.length && !dryRun) {
    for (const id of orphaned) {
      await cancelPendingLiveOutboundEmails(admin, id);
      console.log(`cancelled_orphan_session=${id.slice(0, 8)}…`);
    }
  } else if (orphaned.length && dryRun) {
    console.log("dry-run: would cancel orphaned pending for deleted sessions");
  }

  const before = await countPendingOutboundEmails(admin);
  console.log(`pending_after_cancel=${before}`);

  if (dryRun) {
    console.log("dry-run: skip drain");
    return;
  }

  let sent = 0;
  let failed = 0;
  let rounds = 0;
  for (;;) {
    const result = await drainOutboundEmailQueue(admin);
    rounds += 1;
    sent += result.sent;
    failed += result.failed;
    console.log(
      `round=${rounds} processed=${result.processed} sent=${result.sent} failed=${result.failed} pending=${result.pending} abortedAuth=${result.abortedAuth}`,
    );
    if (result.abortedAuth) break;
    if (result.processed === 0) break;
    if (result.pending <= 0) break;
  }

  const afterCount = await countPendingOutboundEmails(admin);
  console.log(`DONE sent=${sent} failed=${failed} rounds=${rounds} pending_left=${afterCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
