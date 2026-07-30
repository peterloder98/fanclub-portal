import { buildEmailFromPlainText } from "@/lib/email/email-layout";

export const REFERRAL_REMINDER_FIRST_AFTER_DAYS = 7;
export const REFERRAL_REMINDER_INTERVAL_DAYS = 14;

export function memberReferralReminderSubject(senderFullName: string) {
  const sender = senderFullName.trim() || "Ein Fanclub-Mitglied";
  return `Erinnerung: ${sender} hat dich in den Anni Perka Fanclub eingeladen`;
}

const MEMBER_REFERRAL_REMINDER_BODY = `Hallo {{recipient_first_name}},

vor kurzem habe ich dich eingeladen, dem **Anni Perka Fanclub** beizutreten — und ich wollte kurz nachfragen, ob du die Einladung schon gesehen hast.

Falls noch nicht: Hier kannst du dich ganz einfach digital anmelden:

**{{application_link}}**

Der Jahresbeitrag beträgt **15 €**. Die Anmeldung geht komplett online — ohne Ausdrucken oder Einscannen.

Ich würde mich freuen, dich bald im Fanclub begrüßen zu dürfen!

Liebe Grüße

{{sender_name}}`;

export function composeMemberReferralReminderBody(input: {
  recipientFirstName: string;
  senderName: string;
  applicationLink: string;
}) {
  const first = input.recipientFirstName.trim() || "…";
  const sender = input.senderName.trim() || "…";
  const link = input.applicationLink.trim();
  return MEMBER_REFERRAL_REMINDER_BODY.replace(/\{\{recipient_first_name\}\}/g, first)
    .replace(/\{\{sender_name\}\}/g, sender)
    .replace(/\{\{application_link\}\}/g, link);
}

export function buildMemberReferralReminderHtml(text: string) {
  return buildEmailFromPlainText(text, { markdown: true });
}

export type ReferralReminderEligibility = {
  canRemind: boolean;
  /** ISO-Zeitpunkt, ab dem der Button wieder erscheint (null = sofort oder nie) */
  nextAt: string | null;
  reason: "ok" | "converted" | "too_early" | "cooldown";
};

export function referralReminderEligibility(
  input: {
    created_at: string;
    last_reminder_at: string | null;
    approved_at: string | null;
    converted_application_id: string | null;
  },
  now = new Date(),
): ReferralReminderEligibility {
  if (input.approved_at || input.converted_application_id) {
    return { canRemind: false, nextAt: null, reason: "converted" };
  }

  const created = new Date(input.created_at).getTime();
  if (!Number.isFinite(created)) {
    return { canRemind: false, nextAt: null, reason: "too_early" };
  }

  if (!input.last_reminder_at) {
    const firstAt = created + REFERRAL_REMINDER_FIRST_AFTER_DAYS * 86_400_000;
    if (now.getTime() >= firstAt) {
      return { canRemind: true, nextAt: null, reason: "ok" };
    }
    return {
      canRemind: false,
      nextAt: new Date(firstAt).toISOString(),
      reason: "too_early",
    };
  }

  const last = new Date(input.last_reminder_at).getTime();
  if (!Number.isFinite(last)) {
    return { canRemind: false, nextAt: null, reason: "cooldown" };
  }
  const next = last + REFERRAL_REMINDER_INTERVAL_DAYS * 86_400_000;
  if (now.getTime() >= next) {
    return { canRemind: true, nextAt: null, reason: "ok" };
  }
  return {
    canRemind: false,
    nextAt: new Date(next).toISOString(),
    reason: "cooldown",
  };
}
