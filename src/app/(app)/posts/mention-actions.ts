"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { extractMentionUserIds } from "@/lib/mentions/format";

/** In-App-Benachrichtigung für @-Markierungen (keine E-Mail). */
export async function notifyMentionsFromText(input: {
  text: string;
  postId: string;
  excludeUserId?: string | null;
  context: "post" | "comment";
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

  const linkUrl = `/posts?focus=${input.postId}`;
  await Promise.all(
    ids.map((userId) =>
      createUserNotification({
        userId,
        kind: NOTIFICATION_KINDS.mention,
        title: `${actorName} hat dich markiert`,
        body:
          input.context === "comment"
            ? "Du wurdest in einem Kommentar erwähnt."
            : "Du wurdest in einem Beitrag erwähnt.",
        linkUrl,
        linkLabel: "Zum Beitrag",
        metadata: { post_id: input.postId, context: input.context },
      }).catch(() => null),
    ),
  );
}
