/** Mentions: @[Anzeigename](user-uuid) */

const MENTION_RE = /@\[([^\]]+)\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi;

export function formatMentionToken(displayName: string, userId: string): string {
  const name = displayName.trim().replace(/[\[\]]/g, "") || "Mitglied";
  return `@[${name}](${userId})`;
}

export function extractMentionUserIds(text: string): string[] {
  const ids = new Set<string>();
  const re = new RegExp(MENTION_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    ids.add(m[2]!.toLowerCase());
  }
  return [...ids];
}

export type MentionSegment =
  | { type: "text"; value: string }
  | { type: "mention"; name: string; userId: string };

export function splitMentionText(text: string): MentionSegment[] {
  const out: MentionSegment[] = [];
  const re = new RegExp(MENTION_RE.source, "gi");
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ type: "text", value: text.slice(last, m.index) });
    }
    out.push({ type: "mention", name: m[1]!, userId: m[2]! });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  if (!out.length) out.push({ type: "text", value: text });
  return out;
}

/** Lesbarer Klartext für Previews (@Name statt Token). */
export function mentionTextToPlain(text: string): string {
  return text.replace(new RegExp(MENTION_RE.source, "gi"), "@$1");
}
