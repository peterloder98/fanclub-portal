/** Post-Reaktionen — muss mit supabase/119_post_reactions.sql übereinstimmen. */

export const POST_REACTION_TYPES = [
  "heart",
  "thumbs_up",
  "sad",
  "celebrate",
  "wow",
] as const;

export type PostReactionType = (typeof POST_REACTION_TYPES)[number];

export type PostReactionCounts = Partial<Record<PostReactionType, number>>;

export const POST_REACTION_META: Record<
  PostReactionType,
  { emoji: string; label: string; ariaLabel: string }
> = {
  heart: { emoji: "❤️", label: "Herz", ariaLabel: "Herz" },
  thumbs_up: { emoji: "👍", label: "Daumen hoch", ariaLabel: "Daumen hoch" },
  sad: { emoji: "😢", label: "Traurig", ariaLabel: "Traurig" },
  celebrate: { emoji: "🎉", label: "Feiern", ariaLabel: "Feiern" },
  wow: { emoji: "😮", label: "Wow", ariaLabel: "Wow" },
};

export function totalReactionCount(counts: PostReactionCounts): number {
  return POST_REACTION_TYPES.reduce((sum, t) => sum + (counts[t] ?? 0), 0);
}

export function reactionTypesWithCounts(counts: PostReactionCounts): PostReactionType[] {
  return POST_REACTION_TYPES.filter((t) => (counts[t] ?? 0) > 0);
}

export function emptyReactionCounts(): Record<PostReactionType, number> {
  return {
    heart: 0,
    thumbs_up: 0,
    sad: 0,
    celebrate: 0,
    wow: 0,
  };
}

export function buildReactionCounts(
  rows: Array<{ reaction_type: string }>,
): Record<PostReactionType, number> {
  const counts = emptyReactionCounts();
  for (const row of rows) {
    const t = row.reaction_type as PostReactionType;
    if (POST_REACTION_TYPES.includes(t)) {
      counts[t] += 1;
    }
  }
  return counts;
}
