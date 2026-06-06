/**
 * Test-Kommentare anderer Mitglieder auf Peters Beiträge + Benachrichtigungen.
 *
 * node --env-file=.env.local scripts/seed-post-comments-peter.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const PETER_EMAIL = "mail@peter-loder.de";

const COMMENTS = [
  "Starker Beitrag — danke fürs Teilen!",
  "Da bin ich ganz bei dir 👍",
  "Super formuliert, finde ich auch!",
  "Gute Idee, das sollten wir im Club öfter machen.",
];

async function findUserIdByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

function displayName(p) {
  if (p?.first_name && p?.last_name) return `${p.first_name} ${p.last_name}`;
  return p?.email?.split("@")[0] ?? "Mitglied";
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

async function main() {
  const peterId = await findUserIdByEmail(PETER_EMAIL);
  if (!peterId) {
    console.error(`Kein User mit ${PETER_EMAIL} gefunden.`);
    process.exit(1);
  }

  let { data: posts } = await admin
    .from("posts")
    .select("id,title,author_id,status")
    .eq("author_id", peterId)
    .in("status", ["approved", "pending"])
    .order("created_at", { ascending: false })
    .limit(4);

  if (!posts?.length) {
    const { data: anyPosts } = await admin
      .from("posts")
      .select("id,title,author_id,status")
      .in("status", ["approved", "pending"])
      .order("created_at", { ascending: false })
      .limit(8);
    posts = (anyPosts ?? []).filter((p) => p.author_id === peterId);
  }

  if (!posts?.length) {
    console.error("Keine Beiträge von Peter gefunden — bitte zuerst einen Post erstellen.");
    process.exit(1);
  }

  const { data: others } = await admin
    .from("profiles")
    .select("id,first_name,last_name,email,role")
    .neq("id", peterId)
    .limit(12);

  const commenters = (others ?? []).filter((p) => p.role !== "anni");
  if (!commenters.length) {
    console.error("Keine anderen Mitglieder für Test-Kommentare gefunden.");
    process.exit(1);
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? "").replace(
    /\/$/,
    "",
  );
  const linkUrl = base ? `${base}/dashboard` : "/dashboard";

  const targetPosts = posts.slice(0, 4);
  let created = 0;

  for (let i = 0; i < targetPosts.length; i++) {
    const post = targetPosts[i];
    const author = commenters[i % commenters.length];
    const text = COMMENTS[i % COMMENTS.length];
    const now = new Date().toISOString();

    const { data: existing } = await admin
      .from("post_comments")
      .select("id")
      .eq("post_id", post.id)
      .eq("author_id", author.id)
      .eq("body", text)
      .maybeSingle();

    if (existing) {
      console.log(`Übersprungen (existiert): „${text.slice(0, 40)}…"`);
      continue;
    }

    const { data: inserted, error: cErr } = await admin
      .from("post_comments")
      .insert({
        post_id: post.id,
        author_id: author.id,
        body: text,
      })
      .select("id")
      .single();

    if (cErr) {
      console.error("Kommentar fehlgeschlagen:", cErr.message);
      continue;
    }

    const name = displayName(author);
    const previewShort = text.length > 120 ? `${text.slice(0, 120)}…` : text;

    const { error: nErr } = await admin.from("user_notifications").insert({
      user_id: peterId,
      kind: "post_comment",
      title: `${name} hat deinen Beitrag kommentiert`,
      body: previewShort ? `„${previewShort}"` : null,
      link_url: linkUrl,
      link_label: "Zum Dashboard",
      metadata: {
        post_id: post.id,
        post_title: post.title,
        commenter_user_id: author.id,
        comment_id: inserted.id,
        seeded: true,
      },
    });

    if (nErr) {
      console.error("Notification fehlgeschlagen:", nErr.message);
      continue;
    }

    created += 1;
    console.log(`✓ ${name} → „${post.title?.slice(0, 50) ?? post.id}": ${text}`);
  }

  console.log(`\nFertig: ${created} Kommentar(e) + Benachrichtigung(en) für Peter.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
