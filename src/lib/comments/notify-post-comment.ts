import { createUserNotification } from "@/lib/notifications/create";
import { dashboardPostLink } from "@/lib/notifications/dashboard-post-link";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

export async function notifyPostComment(input: {
  recipientUserId: string;
  commenterUserId: string;
  commenterName: string;
  postId: string;
  postTitle: string;
  commentPreview: string;
  commentedAt: string;
}) {
  if (input.recipientUserId === input.commenterUserId) return;

  const preview = input.commentPreview.trim();
  const previewShort =
    preview.length > 120 ? `${preview.slice(0, 120)}…` : preview;

  await createUserNotification({
    userId: input.recipientUserId,
    kind: NOTIFICATION_KINDS.postComment,
    title: `${input.commenterName} hat deinen Beitrag kommentiert`,
    body: previewShort ? `„${previewShort}"` : null,
    linkUrl: dashboardPostLink(input.postId),
    linkLabel: "Beitrag ansehen",
    metadata: {
      post_id: input.postId,
      post_title: input.postTitle,
      commenter_user_id: input.commenterUserId,
      commented_at: input.commentedAt,
    },
  });
}
