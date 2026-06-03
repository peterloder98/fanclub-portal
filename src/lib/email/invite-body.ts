/** Live-Ersetzung von Namen in Einladungs-E-Mails (Admin + Mitglied werben). */

export function replaceHeyRecipient(body: string, previous: string, next: string) {
  const prev = (previous.trim() || "du").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nxt = next.trim() || "du";
  const firstLine = body.split("\n")[0] ?? "";
  if (/^Hey\s/i.test(firstLine)) {
    return body.replace(new RegExp(`^Hey\\s+${prev}\\s*,`, "i"), `Hey ${nxt},`);
  }
  return body;
}

export function replaceClosingSender(body: string, previous: string, next: string) {
  const prev = previous.trim();
  const nxt = next.trim();
  if (!prev || prev === nxt) return body;
  const marker = "Liebe Grüße,";
  const idx = body.lastIndexOf(marker);
  if (idx < 0) return body;
  const tail = body.slice(idx + marker.length);
  if (tail.trimStart().startsWith(prev)) {
    return `${body.slice(0, idx + marker.length)}\n${nxt}${body.slice(idx + marker.length + tail.indexOf(prev) + prev.length)}`;
  }
  const lines = body.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i]?.trim() === prev) {
      lines[i] = nxt;
      return lines.join("\n");
    }
  }
  return body;
}

export const MEMBER_REFERRAL_SUBJECT = "digitaler Antrag Anni Perka Fanclub";

export function composeMemberReferralBody(input: {
  recipientName: string;
  senderName: string;
  applicationLink: string;
}) {
  const recipient = input.recipientName.trim() || "…";
  const sender = input.senderName.trim() || "…";
  const link = input.applicationLink.trim();

  return `Hey ${recipient},
ich wollte dir gerne den Link zum digitalen Antrag für den Anni Perka Fanclub senden.
Es würde mich total freuen wenn du mitmachst in unserem Fanclub.
Einfach alles ausfüllen und digital unterzeichnen, alles ganz easy.
${link ? `\nHier geht's zum Antrag:\n${link}\n` : ""}
Liebe Grüße,
${sender}`;
}
