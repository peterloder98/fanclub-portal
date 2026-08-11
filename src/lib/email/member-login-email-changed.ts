import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { emailPersonVars } from "@/lib/email/salutation-block";

function isRealMemberEmail(email: string | null | undefined): email is string {
  const e = email?.trim().toLowerCase() ?? "";
  if (!e || !e.includes("@")) return false;
  if (/noemail|fanclub-import\.invalid|@invalid$/i.test(e)) return false;
  return true;
}

/** Info an Mitglied (und ggf. alte Adresse), wenn Login-E-Mail geändert wurde. */
export async function sendMemberLoginEmailChangedNotice(input: {
  firstName: string;
  gender?: string | null;
  oldEmail: string | null;
  newEmail: string;
  userId?: string;
}): Promise<{ sentTo: string[]; errors: string[] }> {
  const newEmail = input.newEmail.trim().toLowerCase();
  if (!isRealMemberEmail(newEmail)) {
    return { sentTo: [], errors: ["Neue E-Mail ungültig."] };
  }

  const person = emailPersonVars({
    firstName: input.firstName,
    gender: input.gender,
  });
  const rendered = await renderEmailFromTemplate(EMAIL_TEMPLATE_KEYS.memberLoginEmailChanged, {
    ...person,
    new_email: newEmail,
    old_email: input.oldEmail?.trim() || "—",
  });

  const recipients = new Set<string>();
  recipients.add(newEmail);
  if (isRealMemberEmail(input.oldEmail) && input.oldEmail.trim().toLowerCase() !== newEmail) {
    recipients.add(input.oldEmail.trim().toLowerCase());
  }

  const sentTo: string[] = [];
  const errors: string[] = [];

  for (const to of recipients) {
    const result = await sendEmailWithLog({
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments: rendered.signatureAttachment
        ? [rendered.signatureAttachment]
        : undefined,
      templateKey: EMAIL_TEMPLATE_KEYS.memberLoginEmailChanged,
      context: {
        user_id: input.userId ?? null,
        old_email: input.oldEmail,
        new_email: newEmail,
      },
    });
    if (result.ok) sentTo.push(to);
    else errors.push(to);
  }

  return { sentTo, errors };
}

export { isRealMemberEmail };
