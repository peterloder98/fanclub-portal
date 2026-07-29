/**
 * Test-Verwarnung für Peter (ohne Kommentar zu löschen).
 *
 * npx tsx --env-file=.env.local scripts/issue-test-warning-peter.ts
 */
import { createClient } from "@supabase/supabase-js";
import { buildCommentWarningEmail } from "@/lib/moderation/warning-email";
import { buildHtmlFromPlain } from "@/lib/email/build-html-from-plain";
import { loadSignaturePickerData } from "@/lib/email/draft-with-signatures";
import { loadMailSignature, CLUB_SIGNATURE_ID } from "@/lib/email/signatures";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

const PETER_EMAIL = "mail@peter-loder.de";
const CHAT_MESSAGE_ID = "6908f48b-5766-43cb-a7e9-e8972e51407f";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

function formatDE(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

async function findUserIdByEmail(email: string) {
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

async function main() {
  const memberId = await findUserIdByEmail(PETER_EMAIL);
  if (!memberId) throw new Error(`Kein User: ${PETER_EMAIL}`);

  const { data: c, error: cErr } = await admin
    .from("group_chat_messages")
    .select("id,body,created_at,author_id")
    .eq("id", CHAT_MESSAGE_ID)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!c || c.author_id !== memberId) {
    throw new Error("Chat-Nachricht nicht gefunden oder gehört nicht Peter.");
  }

  const { data: member, error: mErr } = await admin
    .from("profiles")
    .select("id,email,first_name,gender,warning_count")
    .eq("id", memberId)
    .maybeSingle();
  if (mErr) throw mErr;
  if (!member) throw new Error("Profil nicht gefunden.");

  const previousWarnings = member.warning_count ?? 0;
  const newCount = previousWarnings + 1;
  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://fanclub.anniperka.de").replace(
    /\/$/,
    "",
  );

  const { data: warningRow, error: warnInsErr } = await admin
    .from("member_warnings")
    .insert({
      member_id: memberId,
      issued_by: memberId,
      comment_type: "chat",
      comment_id: c.id,
      comment_text: c.body,
      comment_created_at: c.created_at,
      context_title: "Gruppenchat",
      context_author_name: "Peter Loder",
      context_kind: "chat",
    })
    .select("id")
    .single();
  if (warnInsErr) throw warnInsErr;

  const { error: upErr } = await admin
    .from("profiles")
    .update({ warning_count: newCount })
    .eq("id", memberId);
  if (upErr) throw upErr;

  const commentSnippet = c.body.length > 160 ? `${c.body.slice(0, 160)}…` : c.body;

  const noteId = await createUserNotification({
    userId: memberId,
    kind: NOTIFICATION_KINDS.warningIssued,
    title: "Du hast eine Verwarnung erhalten",
    body: `„${commentSnippet}" — Bitte unsere Fanclub-Regeln beachten.`,
    linkUrl: `${base}/regeln`,
    linkLabel: "Fanclub-Regeln",
    metadata: {
      warning_id: warningRow?.id,
      warning_count: newCount,
      comment_text: commentSnippet,
      context_kind: "chat",
      context_title: "Gruppenchat",
      test: true,
    },
  });

  const { defaultSignatureId, signatureTexts } = await loadSignaturePickerData();
  const adminSig =
    signatureTexts[defaultSignatureId] ??
    signatureTexts[CLUB_SIGNATURE_ID] ??
    "Dein Fanclub-Team";
  const sigMail = await loadMailSignature(defaultSignatureId || CLUB_SIGNATURE_ID);

  let mailResult: { ok?: boolean; skipped?: boolean; error?: string } = { skipped: true };
  if (member.email) {
    const { subject, text } = buildCommentWarningEmail({
      firstName: member.first_name?.trim() || "Peter",
      gender: member.gender,
      commentText: c.body,
      commentDateLabel: formatDE(c.created_at),
      contextTitle: "Gruppenchat",
      contextKind: "chat",
      contextAuthorName: "Peter Loder",
      adminSignature: adminSig,
      rulesUrl: `${base}/regeln`,
    });
    const html = buildHtmlFromPlain(text, sigMail.htmlBlock, adminSig);
    mailResult = await sendEmailViaAccount({
      to: member.email,
      subject: `[Test] ${subject}`,
      text,
      html,
    });
  }

  console.log("OK — Test-Verwarnung ausgestellt");
  console.log("  Mitglied:", member.email, `(${newCount}. Verwarnung)`);
  console.log("  Warning ID:", warningRow?.id);
  console.log("  Notification:", noteId ?? "(keine)");
  console.log("  E-Mail:", mailResult);
  console.log("  Regeln:", `${base}/regeln`);
  console.log("  Hinweis: Chat-Nachricht wurde NICHT gelöscht.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
