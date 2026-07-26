import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmailWithLog } from "@/lib/email/send-log";
import {
  createUserNotification,
  notifyAllAdmins,
} from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
}

/** Admin: In-App + E-Mail bei Stammdaten-Änderungsantrag. */
export async function notifyAdminsProfileChangeRequest(input: {
  requestId: string;
  membershipNumber: string | null;
  memberName: string;
  createdAt: string;
}) {
  const admin = createSupabaseAdminClient();
  const base = appBaseUrl();
  const reviewUrl = base
    ? `${base}/admin/members/profile-changes?focus=${input.requestId}`
    : `/admin/members/profile-changes?focus=${input.requestId}`;

  const nr = input.membershipNumber?.trim() || "—";
  const when = (() => {
    try {
      return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(input.createdAt));
    } catch {
      return input.createdAt;
    }
  })();

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

  const { data: admins } = await admin
    .from("profiles")
    .select("email,first_name")
    .eq("role", "admin")
    .not("email", "is", null);

  const recipients = (admins ?? []).filter((a) => a.email?.trim());
  const subject = `Stammdaten-Änderung: ${input.memberName} (Nr. ${nr})`;
  const text = `Hallo,

bei Mitgliednummer ${nr}, ${input.memberName} fand am ${when} eine Änderung der Stammdaten statt.

Bitte hier klicken, um die Änderungen zu sehen und freizugeben:
${reviewUrl}

Anni Perka Fanclub`;

  let sent = 0;
  for (const adm of recipients) {
    const result = await sendEmailWithLog({
      to: adm.email!,
      subject,
      text,
      html: text.replace(/\n/g, "<br>"),
      templateKey: "profile_change_pending_admin",
      context: { request_id: input.requestId },
    });
    if (result.ok) sent++;
  }
  return { sent };
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
