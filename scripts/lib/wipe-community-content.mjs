/** Shared wipe for community tables (keeps profiles & memberships). */

const COMMUNITY_TABLES = [
  "giveaway_winners",
  "giveaway_entries",
  "giveaways",
  "poll_votes",
  "poll_options",
  "polls",
  "post_likes",
  "post_comments",
  "post_media",
  "posts",
  "points_transactions",
  "voting_clicks",
  // event_participations bewusst nicht — echte Event-Zusagen behalten
  "user_notifications",
  "member_activity_log",
  "member_warnings",
  // membership_applications / radio bewusst nicht — echte Anträge behalten
];

async function wipeTable(admin, table, dryRun) {
  if (dryRun) {
    console.log(`[dry] wipe ${table}`);
    return;
  }
  const { error } = await admin.from(table).delete().gte("created_at", "1970-01-01T00:00:00Z");
  if (error) {
    const { error: e2 } = await admin.from(table).delete().not("id", "is", null);
    if (e2) console.warn(`  ${table}: ${error.message}`);
    else console.log(`geleert: ${table}`);
  } else {
    console.log(`geleert: ${table}`);
  }
}

export async function wipeCommunityContent(admin, { dryRun = false } = {}) {
  for (const t of COMMUNITY_TABLES) {
    await wipeTable(admin, t, dryRun);
  }
}

export { COMMUNITY_TABLES };
