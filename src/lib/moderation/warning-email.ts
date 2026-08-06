import { buildEmailSalutation } from "@/lib/email/salutation-block";
import { communityRulesUrl } from "@/lib/community/rules";

export type WarningContextKind =
  | "post"
  | "poll"
  | "giveaway"
  | "chat"
  | "live_chat"
  | "live_question";

export function buildCommentWarningEmail(input: {
  firstName: string;
  gender?: string | null;
  commentText: string;
  commentDateLabel: string;
  contextTitle: string;
  contextKind: WarningContextKind;
  contextAuthorName: string;
  adminSignature: string;
  rulesUrl?: string;
}): { subject: string; text: string } {
  const isChatLike =
    input.contextKind === "chat" ||
    input.contextKind === "live_chat" ||
    input.contextKind === "live_question";

  const contextLabel =
    input.contextKind === "poll"
      ? "Umfrage"
      : input.contextKind === "giveaway"
        ? "Gewinnspiel"
        : input.contextKind === "chat"
          ? "Gruppenchat"
          : input.contextKind === "live_chat"
            ? "Live-Chat"
            : input.contextKind === "live_question"
              ? "Live-Fragen"
              : "Beitrag";

  const subject = isChatLike
    ? "Verwarnung aufgrund einer Chat-Nachricht"
    : "Verwarnung aufgrund eines Kommentars";

  const deletedLine = isChatLike
    ? `leider mussten wir deine Nachricht "${input.commentText}" vom ${input.commentDateLabel} im ${contextLabel} löschen.`
    : `leider mussten wir deinen Kommentar "${input.commentText}" vom ${input.commentDateLabel} unter der ${contextLabel} "${input.contextTitle}" von ${input.contextAuthorName} löschen.`;

  const greeting = buildEmailSalutation(input.firstName, input.gender);
  const rulesLink = input.rulesUrl ?? communityRulesUrl();

  const text = [
    `${greeting},`,
    "",
    deletedLine,
    "",
    "Hierfür müssen wir leider eine Verwarnung aussprechen.",
    "",
    "Bitte halte dich künftig an unsere Fanclub-Regeln (WhatsApp-Gruppe und Fanclub App):",
    rulesLink,
    "",
    input.adminSignature.trim(),
  ].join("\n");

  return { subject, text };
}
