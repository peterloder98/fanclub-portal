import { buildEmailFromPlainText } from "@/lib/email/email-layout";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { listAdminNotifyRecipients } from "@/lib/email/admin-notify-recipients";
import {
  createUserNotification,
  notifyAllAdmins,
} from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
}

function snippet(body: string, max = 140) {
  const t = body.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** Admin: In-App + E-Mail an alle Vorstände (und Club-SMTP-Postfach). */
export async function notifyAdminsPendingPost(input: {
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
}) {
  const base = appBaseUrl();
  const reviewUrl = base ? `${base}/admin/posts` : "/admin/posts";

  await notifyAllAdmins({
    kind: NOTIFICATION_KINDS.postPendingReview,
    title: "Neuer Post zur Freigabe",
    body: `${input.authorName}: „${snippet(input.body, 80)}"`,
    linkUrl: reviewUrl,
    linkLabel: "Zur Freigabe",
    metadata: { post_id: input.postId, author_id: input.authorId },
  }).catch(console.error);

  const recipients = await listAdminNotifyRecipients();
  if (!recipients.length) {
    console.warn("[email] Keine Admin-Empfänger für Post-Freigabe.");
    return { sent: 0 };
  }

  const subject = `Post zur Freigabe: ${input.authorName}`;
  const text = `Hallo,

${input.authorName} hat einen neuen Beitrag eingereicht, der freigegeben werden muss:

„${snippet(input.body, 280)}"

Zur Prüfung:
${reviewUrl}

Anni Perka Fanclub`;

  let sent = 0;
  for (const r of recipients) {
    const result = await sendEmailWithLog({
      to: r.email,
      subject,
      text,
      html: buildEmailFromPlainText(text),
      templateKey: "post_pending_admin",
      context: { post_id: input.postId },
      bypassTestAllowlist: true,
    });
    if (result.ok) sent += 1;
  }

  return { sent };
}

/** Mitglied: nur In-App bei Freigabe oder Ablehnung. */
export async function notifyMemberPostModerationResult(input: {
  authorId: string;
  postId: string;
  approved: boolean;
  body: string;
}) {
  const base = appBaseUrl();
  const feedUrl = input.approved
    ? base
      ? `${base}/dashboard?post=${input.postId}`
      : `/dashboard?post=${input.postId}`
    : base
      ? `${base}/posts`
      : "/posts";

  await createUserNotification({
    userId: input.authorId,
    kind: input.approved
      ? NOTIFICATION_KINDS.postApproved
      : NOTIFICATION_KINDS.postRejected,
    title: input.approved ? "Dein Post wurde freigegeben" : "Dein Post wurde abgelehnt",
    body: input.approved
      ? `Dein Beitrag ist jetzt sichtbar: „${snippet(input.body, 80)}"`
      : `Dein Beitrag wurde nicht freigegeben: „${snippet(input.body, 80)}"`,
    linkUrl: feedUrl,
    linkLabel: input.approved ? "Zum Post" : "Zu meinen Posts",
    metadata: { post_id: input.postId, status: input.approved ? "approved" : "rejected" },
  });
}
