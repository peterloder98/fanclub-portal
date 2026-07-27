/**
 * Befüllt bestehende Verwarnungs-Benachrichtigungen mit comment_text / neuem Titel.
 *
 * Usage:
 *   npx --yes tsx --env-file=.env.local scripts/backfill-warning-notifications.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

async function main() {
  const { data: notes, error } = await admin
    .from("user_notifications")
    .select("id,title,body,metadata")
    .eq("kind", "warning_issued");
  if (error) throw error;

  let updated = 0;
  for (const n of notes ?? []) {
    const meta = (n.metadata ?? {}) as Record<string, unknown>;
    const warningId = typeof meta.warning_id === "string" ? meta.warning_id : null;
    let commentText =
      typeof meta.comment_text === "string" ? meta.comment_text.trim() : "";

    if (!commentText && warningId) {
      const { data: w } = await admin
        .from("member_warnings")
        .select("comment_text,context_title")
        .eq("id", warningId)
        .maybeSingle();
      commentText = w?.comment_text?.trim() ?? "";
    }

    const count =
      typeof meta.warning_count === "number"
        ? meta.warning_count
        : Number.parseInt(String(meta.warning_count ?? ""), 10) || null;

    const nextMeta = {
      ...meta,
      ...(commentText ? { comment_text: commentText } : {}),
      ...(count != null ? { warning_count: count } : {}),
    };
    const nextTitle = "Du hast eine Verwarnung erhalten";
    const nextBody = commentText ? `„${commentText}"` : n.body;

    const { error: upErr } = await admin
      .from("user_notifications")
      .update({
        title: nextTitle,
        body: nextBody,
        metadata: nextMeta,
      })
      .eq("id", n.id);
    if (upErr) throw upErr;
    updated += 1;
    console.log("updated", n.id, commentText.slice(0, 40));
  }
  console.log(`Done. ${updated} notification(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
