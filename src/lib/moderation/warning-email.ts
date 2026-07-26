export function buildCommentWarningEmail(input: {
  firstName: string;
  commentText: string;
  commentDateLabel: string;
  contextTitle: string;
  contextKind: "post" | "poll" | "giveaway" | "chat";
  contextAuthorName: string;
  adminSignature: string;
}): { subject: string; text: string } {
  const isChat = input.contextKind === "chat";
  const contextLabel =
    input.contextKind === "poll"
      ? "Umfrage"
      : input.contextKind === "giveaway"
        ? "Gewinnspiel"
        : input.contextKind === "chat"
          ? "Gruppenchat"
          : "Beitrag";

  const subject = isChat
    ? "Verwarnung aufgrund einer Chat-Nachricht"
    : "Verwarnung aufgrund eines Kommentars";

  const deletedLine = isChat
    ? `leider mussten wir deine Nachricht "${input.commentText}" vom ${input.commentDateLabel} im ${contextLabel} löschen.`
    : `leider mussten wir deinen Kommentar "${input.commentText}" vom ${input.commentDateLabel} unter der ${contextLabel} "${input.contextTitle}" von ${input.contextAuthorName} löschen.`;

  const text = [
    `Liebe/r ${input.firstName},`,
    "",
    deletedLine,
    "",
    "Hierfür müssen wir leider eine Verwarnung aussprechen.",
    "",
    "Bitte halte dich zukünftig an die Gruppenregeln für ein angenehmes Miteinander und den Spaß am gemeinsamen Fanclub :-)",
    "",
    input.adminSignature.trim(),
  ].join("\n");

  return { subject, text };
}
