export function buildCommentWarningEmail(input: {
  firstName: string;
  commentText: string;
  commentDateLabel: string;
  contextTitle: string;
  contextKind: "post" | "poll" | "giveaway";
  contextAuthorName: string;
  adminSignature: string;
}): { subject: string; text: string } {
  const contextLabel =
    input.contextKind === "poll"
      ? "Umfrage"
      : input.contextKind === "giveaway"
        ? "Gewinnspiel"
        : "Beitrag";

  const subject = "Verwarnung aufgrund eines Kommentars";
  const text = [
    `Liebe/r ${input.firstName},`,
    "",
    `leider mussten wir deinen Kommentar "${input.commentText}" vom ${input.commentDateLabel} unter der ${contextLabel} "${input.contextTitle}" von ${input.contextAuthorName} löschen.`,
    "",
    "Hierfür müssen wir leider eine Verwarnung aussprechen.",
    "",
    "Bitte halte dich zukünftig an die Gruppenregeln für ein angenehmes Miteinander und den Spaß am gemeinsamen Fanclub :-)",
    "",
    input.adminSignature.trim(),
  ].join("\n");

  return { subject, text };
}
