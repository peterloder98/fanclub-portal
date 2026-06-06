import { createUserNotification } from "@/lib/notifications/create";
import { dashboardPostLink } from "@/lib/notifications/dashboard-post-link";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

export async function notifyCommentReply(input: {
  recipientUserId: string;
  replierUserId: string;
  replierName: string;
  postId: string;
  postTitle: string;
  replyPreview: string;
  repliedAt: string;
}) {
  if (input.recipientUserId === input.replierUserId) return;

  const preview = input.replyPreview.trim();
  const previewShort =
    preview.length > 120 ? `${preview.slice(0, 120)}…` : preview;

  await createUserNotification({
    userId: input.recipientUserId,
    kind: NOTIFICATION_KINDS.commentReply,
    title: `${input.replierName} hat auf deinen Kommentar geantwortet`,
    body: previewShort ? `„${previewShort}"` : null,
    linkUrl: dashboardPostLink(input.postId),
    linkLabel: "Beitrag ansehen",
    metadata: {
      post_id: input.postId,
      post_title: input.postTitle,
      replier_user_id: input.replierUserId,
      replied_at: input.repliedAt,
    },
  });
}
