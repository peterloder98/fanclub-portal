/** Placeholder title while the feed composer attaches media before submit. */
export const COMPOSER_DRAFT_TITLE = "…";

/**
 * Media attach creates a DB row with empty body and status `pending` so files
 * can hang off a post_id. That row is not a member submission until they tap
 * “Zur Freigabe senden” / “Posten” (which requires text).
 */
export function isUnsubmittedComposerDraft(post: {
  status?: string | null;
  body?: string | null;
}): boolean {
  if ((post.status ?? "") !== "pending") return false;
  return !(post.body ?? "").trim();
}
