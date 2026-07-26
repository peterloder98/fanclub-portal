"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { extractMentionUserIds } from "@/lib/mentions/format";

/** In-App-Benachrichtigung für @-Markierungen (keine E-Mail). */
export async function notifyMentionsFromText(input: {
  text: string;
  excludeUserId?: string | null;
  /** Legacy: Post-Kontext */
  postId?: string;
  context?: "post" | "comment" | "poll" | "giveaway" | "voting" | "chat" | string;
  linkUrl?: string;
  linkLabel?: string;
  body?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: me } = await supabase
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", user.id)
    .maybeSingle();
  const actorName =
    me?.first_name && me?.last_name
      ? `${me.first_name} ${me.last_name}`
      : "Jemand";

  const ids = extractMentionUserIds(input.text).filter(
    (id) => id !== user.id && id !== (input.excludeUserId ?? "").toLowerCase(),
  );
  if (!ids.length) return;

  const context = input.context ?? (input.postId ? "comment" : "comment");
  const linkUrl =
    input.linkUrl ??
    (input.postId ? `/posts?focus=${input.postId}` : "/dashboard");
  const linkLabel = input.linkLabel ?? "Ansehen";
  const body =
    input.body ??
    (context === "post"
      ? "Du wurdest in einem Beitrag erwähnt."
      : context === "poll"
        ? "Du wurdest in einem Umfrage-Kommentar erwähnt."
        : context === "giveaway"
          ? "Du wurdest in einem Gewinnspiel-Kommentar erwähnt."
          : context === "voting"
            ? "Du wurdest in einem Voting-Kommentar erwähnt."
            : "Du wurdest in einem Kommentar erwähnt.");

  await Promise.all(
    ids.map((userId) =>
      createUserNotification({
        userId,
        kind: NOTIFICATION_KINDS.mention,
        title: `${actorName} hat dich markiert`,
        body,
        linkUrl,
        linkLabel,
        metadata: {
          ...(input.postId ? { post_id: input.postId } : {}),
          context,
          ...(input.metadata ?? {}),
        },
      }).catch(() => null),
    ),
  );
}
