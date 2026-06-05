"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildCommentWarningEmail } from "@/lib/moderation/warning-email";
import { buildHtmlFromPlain } from "@/lib/email/build-html-from-plain";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { loadSignaturePickerData } from "@/lib/email/draft-with-signatures";
import { CLUB_SIGNATURE_ID } from "@/lib/email/signatures";
import {
  logMemberActivity,
  MEMBER_ACTIVITY_TYPES,
} from "@/lib/membership/activity-log";

export type CommentWarningInput = {
  commentType: "post" | "poll" | "giveaway";
  commentId: string;
};

function formatDE(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export async function issueCommentWarning(input: CommentWarningInput) {
  const { user, profile: adminProfile } = await requireAdminAction();
  const admin = createSupabaseAdminClient();

  let memberId: string;
  let commentText: string;
  let commentCreatedAt: string;
  let contextTitle: string;
  let contextAuthorName: string;
  let contextKind: "post" | "poll" | "giveaway";
  let memberEmail: string | null;
  let memberFirstName: string;

  if (input.commentType === "post") {
    const { data: c, error } = await admin
      .from("post_comments")
      .select("id,body,created_at,author_id,post_id")
      .eq("id", input.commentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("Kommentar nicht gefunden.");
    memberId = c.author_id;
    commentText = c.body;
    commentCreatedAt = c.created_at;
    contextKind = "post";

    const { data: post } = await admin
      .from("posts")
      .select("title,body,author_id")
      .eq("id", c.post_id)
      .maybeSingle();
    contextTitle = (post?.title || post?.body || "Beitrag").slice(0, 200);
    const { data: author } = await admin
      .from("profiles")
      .select("first_name,last_name,email")
      .eq("id", post?.author_id ?? "")
      .maybeSingle();
    contextAuthorName =
      author?.first_name && author?.last_name
        ? `${author.first_name} ${author.last_name}`
        : (author?.email ?? "Unbekannt");

    const { error: delErr } = await admin.from("post_comments").delete().eq("id", c.id);
    if (delErr) throw new Error(delErr.message);
  } else if (input.commentType === "poll") {
    const { data: c, error } = await admin
      .from("poll_comments")
      .select("id,body,created_at,author_id,poll_id")
      .eq("id", input.commentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("Kommentar nicht gefunden.");
    memberId = c.author_id;
    commentText = c.body;
    commentCreatedAt = c.created_at;
    contextKind = "poll";

    const { data: poll } = await admin
      .from("polls")
      .select("question,author_id")
      .eq("id", c.poll_id)
      .maybeSingle();
    contextTitle = (poll?.question ?? "Umfrage").slice(0, 200);
    const { data: author } = await admin
      .from("profiles")
      .select("first_name,last_name,email")
      .eq("id", poll?.author_id ?? "")
      .maybeSingle();
    contextAuthorName =
      author?.first_name && author?.last_name
        ? `${author.first_name} ${author.last_name}`
        : (author?.email ?? "Unbekannt");

    const { error: delErr } = await admin.from("poll_comments").delete().eq("id", c.id);
    if (delErr) throw new Error(delErr.message);
  } else {
    const { data: c, error } = await admin
      .from("giveaway_comments")
      .select("id,body,created_at,author_id,giveaway_id")
      .eq("id", input.commentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("Kommentar nicht gefunden.");
    memberId = c.author_id;
    commentText = c.body;
    commentCreatedAt = c.created_at;
    contextKind = "giveaway";

    const { data: g } = await admin
      .from("giveaways")
      .select("title,author_id")
      .eq("id", c.giveaway_id)
      .maybeSingle();
    contextTitle = (g?.title ?? "Gewinnspiel").slice(0, 200);
    const { data: author } = await admin
      .from("profiles")
      .select("first_name,last_name,email")
      .eq("id", g?.author_id ?? "")
      .maybeSingle();
    contextAuthorName =
      author?.first_name && author?.last_name
        ? `${author.first_name} ${author.last_name}`
        : (author?.email ?? "Unbekannt");

    const { error: delErr } = await admin.from("giveaway_comments").delete().eq("id", c.id);
    if (delErr) throw new Error(delErr.message);
  }

  const { data: member, error: mErr } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,warning_count")
    .eq("id", memberId)
    .maybeSingle();
  if (mErr) throw new Error(mErr.message);
  if (!member) throw new Error("Mitglied nicht gefunden.");

  memberEmail = member.email;
  memberFirstName = member.first_name?.trim() || "Fan";

  const previousWarnings = member.warning_count ?? 0;
  const newCount = previousWarnings + 1;

  const { data: warningRow, error: warnInsErr } = await admin
    .from("member_warnings")
    .insert({
      member_id: memberId,
      issued_by: user.id,
      comment_type: input.commentType,
      comment_id: input.commentId,
      comment_text: commentText,
      comment_created_at: commentCreatedAt,
      context_title: contextTitle,
      context_author_name: contextAuthorName,
      context_kind: contextKind,
    })
    .select("id")
    .single();
  if (warnInsErr) throw new Error(warnInsErr.message);

  const { error: upErr } = await admin
    .from("profiles")
    .update({ warning_count: newCount })
    .eq("id", memberId);
  if (upErr) throw new Error(upErr.message);

  const adminName =
    `${adminProfile.first_name ?? ""} ${adminProfile.last_name ?? ""}`.trim() || "Admin";
  const contextLabel =
    contextKind === "poll"
      ? "Umfrage"
      : contextKind === "giveaway"
        ? "Gewinnspiel"
        : "Beitrag";
  const commentSnippet =
    commentText.length > 160 ? `${commentText.slice(0, 160)}…` : commentText;

  await logMemberActivity({
    userId: memberId,
    eventType: MEMBER_ACTIVITY_TYPES.warningIssued,
    title: `Verwarnung ausgesprochen (${newCount}. Verwarnung)`,
    details: [
      `Kommentar: „${commentSnippet}"`,
      `vom ${formatDE(commentCreatedAt)}`,
      `unter ${contextLabel} „${contextTitle}"`,
      `von ${contextAuthorName}.`,
      `Ausgesprochen von ${adminName}.`,
    ].join(" "),
    createdBy: user.id,
    metadata: {
      warning_id: warningRow?.id ?? null,
      comment_id: input.commentId,
      comment_type: input.commentType,
      context_kind: contextKind,
      context_title: contextTitle,
      warning_count: newCount,
    },
  }).catch((e) => {
    console.error("[moderation] Aktivitäts-Log fehlgeschlagen:", e);
  });

  const { defaultSignatureId, signatureTexts } = await loadSignaturePickerData();
  const adminSig =
    signatureTexts[defaultSignatureId] ??
    signatureTexts[CLUB_SIGNATURE_ID] ??
    adminName;

  if (memberEmail) {
    const { subject, text } = buildCommentWarningEmail({
      firstName: memberFirstName,
      commentText,
      commentDateLabel: formatDE(commentCreatedAt),
      contextTitle,
      contextKind,
      contextAuthorName,
      adminSignature: adminSig,
    });
    const html = buildHtmlFromPlain(text, `<p>${text.replace(/\n/g, "<br/>")}</p>`);
    await sendEmailViaAccount({
      to: memberEmail,
      subject,
      text,
      html,
    }).catch((e) => {
      console.error("[moderation] Verwarnungs-Mail fehlgeschlagen:", e);
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/polls");
  revalidatePath("/giveaways");

  return {
    ok: true,
    memberId,
    warningCount: newCount,
    isThirdWarning: newCount >= 3,
    deletedCommentId: input.commentId,
  };
}
