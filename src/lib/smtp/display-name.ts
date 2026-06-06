/** Absendername in E-Mail-Clients (From-Header) */
export const DEFAULT_MAIL_DISPLAY_NAME = "Anni Perka Fanclub";

const LEGACY_DISPLAY_NAMES = new Set(["anni perka", "anni-perka-fanclub e. v.", "anni-perka-fanclub"]);

export function resolveMailDisplayName(displayName?: string | null): string {
  const trimmed = displayName?.trim();
  if (!trimmed) return DEFAULT_MAIL_DISPLAY_NAME;
  if (LEGACY_DISPLAY_NAMES.has(trimmed.toLowerCase())) return DEFAULT_MAIL_DISPLAY_NAME;
  return trimmed;
}
