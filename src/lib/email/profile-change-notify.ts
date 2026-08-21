import { buildEmailFromPlainText } from "@/lib/email/email-layout";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { resolveOfficialFanclubEmail } from "@/lib/email/official-fanclub-email";
import {
  createUserNotification,
  notifyAllAdmins,
} from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { formatBerlinDateTimeMedium } from "@/lib/datetime/berlin";

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
}

/** Admin: In-App an alle Vorstände + E-Mail nur an die offizielle Fanclub-Adresse. */
export async function notifyAdminsProfileChangeRequest(input: {
  requestId: string;
  membershipNumber: string | null;
  memberName: string;
  createdAt: string;
}) {
  const base = appBaseUrl();
  const reviewUrl = base
    ? `${base}/admin/members/profile-changes?focus=${input.requestId}`
    : `/admin/members/profile-changes?focus=${input.requestId}`;

  const nr = input.membershipNumber?.trim() || "—";
  const when = formatBerlinDateTimeMedium(input.createdAt) || input.createdAt;

  const title = "Stammdaten-Änderung zur Freigabe";
  const body = `Mitgliedsnr. ${nr}, ${input.memberName} · ${when}`;

  await notifyAllAdmins({
    kind: NOTIFICATION_KINDS.profileChangePending,
    title,
    body,
    linkUrl: reviewUrl,
    linkLabel: "Änderungen prüfen",
    metadata: {
      request_id: input.requestId,
      membership_number: input.membershipNumber,
    },
  }).catch(console.error);

  const to = await resolveOfficialFanclubEmail();
  if (!to) {
    console.warn("[email] Keine offizielle Fanclub-E-Mail für Stammdaten-Benachrichtigung.");
    return { sent: 0 };
  }

  const subject = `Stammdaten-Änderung: ${input.memberName} (Nr. ${nr})`;
  const text = `Hallo,

bei Mitgliednummer ${nr}, ${input.memberName} fand am ${when} eine Änderung der Stammdaten statt.

Bitte hier klicken, um die Änderungen zu sehen und freizugeben:
${reviewUrl}

Anni Perka Fanclub`;

  const result = await sendEmailWithLog({
    to,
    subject,
    text,
    html: buildEmailFromPlainText(text),
    templateKey: "profile_change_pending_admin",
    context: { request_id: input.requestId },
    bypassTestAllowlist: true,
  });

  return { sent: result.ok ? 1 : 0 };
}

export async function notifyMemberProfileChangeResult(input: {
  userId: string;
  approved: boolean;
}) {
  await createUserNotification({
    userId: input.userId,
    kind: input.approved
      ? NOTIFICATION_KINDS.profileChangeApproved
      : NOTIFICATION_KINDS.profileChangeRejected,
    title: input.approved
      ? "Stammdaten-Änderung freigegeben"
      : "Stammdaten-Änderung abgelehnt",
    body: input.approved
      ? "Deine angegebenen Änderungen wurden bestätigt und hinterlegt."
      : "Deine Stammdaten-Änderung wurde nicht freigegeben. Die bisherigen Daten bleiben bestehen.",
    linkUrl: "/profile",
    linkLabel: "Zum Profil",
    metadata: { status: input.approved ? "approved" : "rejected" },
  });
}
