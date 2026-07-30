import { createUserNotification } from "@/lib/notifications/create";
import { dashboardPostLink } from "@/lib/notifications/dashboard-post-link";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import {
  POST_REACTION_META,
  type PostReactionType,
} from "@/lib/posts/reactions";

export async function notifyPostReaction(input: {
  recipientUserId: string;
  reactorUserId: string;
  reactorName: string;
  postId: string;
  postTitle: string;
  reactionType: PostReactionType;
  reactedAt: string;
}) {
  if (input.recipientUserId === input.reactorUserId) return;

  const meta = POST_REACTION_META[input.reactionType];
  const title =
    input.reactionType === "thumbs_up"
      ? `${input.reactorName} gefällt dein Beitrag`
      : `${input.reactorName} hat mit ${meta.emoji} auf deinen Beitrag reagiert`;

  await createUserNotification({
    userId: input.recipientUserId,
    kind: NOTIFICATION_KINDS.postReaction,
    title,
    body: meta.label,
    linkUrl: dashboardPostLink(input.postId),
    linkLabel: "Beitrag ansehen",
    metadata: {
      post_id: input.postId,
      post_title: input.postTitle,
      reactor_user_id: input.reactorUserId,
      reaction_type: input.reactionType,
      reacted_at: input.reactedAt,
    },
  });
}
