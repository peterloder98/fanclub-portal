"use server";

import { redirect } from "next/navigation";
import {
  composeMemberReferralEmail,
  buildMemberReferralHtml,
} from "@/lib/email/member-referral-template";
import {
  composeMemberReferralReminderBody,
  buildMemberReferralReminderHtml,
  memberReferralReminderSubject,
  referralReminderEligibility,
} from "@/lib/email/member-referral-reminder-template";
import { getMembershipApplicationFormUrlForReferrer } from "@/lib/membership/referral-link";
import { assertReferralSendAllowed } from "@/lib/membership/referral-limits";
import { evaluateAndMaybeFlagReferrer } from "@/lib/membership/referral-abuse";
import {
  awardMembershipReferralPoints,
  rollbackMembershipReferralSend,
} from "@/lib/points/award-membership-referral";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { describeEmailSendFailure } from "@/lib/smtp/email-send-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function requireMemberAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getMemberReferralPrefillAction() {
  const { supabase, user } = await requireMemberAction();
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", user.id)
    .maybeSingle();

  const senderName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  const applicationLink = getMembershipApplicationFormUrlForReferrer(user.id);
  const composed = await composeMemberReferralEmail({
    recipientFirstName: "",
    senderName: senderName || "…",
    applicationLink,
  });

  return {
    subject: composed.subject,
    applicationLink,
    senderName,
    body: composed.text,
    bodyTemplate: composed.bodyTemplate,
  };
}

export async function sendMemberReferralEmailAction(input: {
  to: string;
  recipientFirstName: string;
  recipientLastName: string;
  recipientGender: string;
  senderName: string;
  subject: string;
  body: string;
}): Promise<{ ok: true; pointsAwarded: number } | { ok: false; error: string }> {
  const { user } = await requireMemberAction();
  const admin = createSupabaseAdminClient();

  const to = input.to.trim();
  const recipientFirstName = input.recipientFirstName.trim();
  const recipientLastName = input.recipientLastName.trim();
  const recipientGender = input.recipientGender.trim();
  const senderName = input.senderName.trim();
  if (!to || !to.includes("@")) {
    return { ok: false, error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  }
  if (!recipientFirstName) {
    return { ok: false, error: "Bitte den Vornamen der Empfängerin / des Empfängers eingeben." };
  }
  if (!recipientLastName) {
    return { ok: false, error: "Bitte den Nachnamen der Empfängerin / des Empfängers eingeben." };
  }
  if (recipientGender !== "m" && recipientGender !== "w") {
    return { ok: false, error: "Bitte Geschlecht wählen (für Anrede)." };
  }
  if (!senderName) {
    return { ok: false, error: "Bitte deinen Namen als Absender/in eingeben." };
  }

  const limit = await assertReferralSendAllowed(admin, user.id, to);
  if (!limit.ok) return { ok: false, error: limit.message };

  let sendId: string | null = null;
  try {
    const { awarded, points, referralToken, sendId: createdSendId } =
      await awardMembershipReferralPoints(user.id, to, {
        firstName: recipientFirstName,
        lastName: recipientLastName,
        gender: recipientGender,
      });
    sendId = createdSendId;

    const applicationLink = getMembershipApplicationFormUrlForReferrer(user.id, referralToken);
    const composed = await composeMemberReferralEmail({
      recipientFirstName,
      senderName,
      applicationLink,
    });
    const subject = composed.subject;
    const text = composed.text;
    const html = buildMemberReferralHtml(text);

    // Werbe-Mails gehen an Nicht-Mitglieder — im Testmodus erlaubt (Massen-Mails bleiben geschützt).
    const result = await sendEmailWithLog({
      to,
      subject,
      text,
      html,
      bypassTestAllowlist: true,
      templateKey: EMAIL_TEMPLATE_KEYS.membershipReferralInvite,
      context: { kind: "member_referral_invite", sender_id: user.id, send_id: sendId },
    });

    if (!result.ok) {
      if (sendId) await rollbackMembershipReferralSend(sendId, user.id);
      return { ok: false, error: describeEmailSendFailure(result) };
    }

    void evaluateAndMaybeFlagReferrer(admin, user.id).catch((e) =>
      console.error("[referral-abuse] after send:", e),
    );

    return { ok: true as const, pointsAwarded: awarded ? points : 0 };
  } catch (e) {
    if (sendId) await rollbackMembershipReferralSend(sendId, user.id);
    const msg = e instanceof Error ? e.message : "Einladung fehlgeschlagen";
    // Next.js-Digest-Texte nicht an die UI durchreichen
    if (/Server Components render|digest property/i.test(msg)) {
      return {
        ok: false,
        error: "Einladung fehlgeschlagen. Bitte erneut versuchen oder den Vorstand informieren.",
      };
    }
    return { ok: false, error: msg };
  }
}

export async function sendMemberReferralReminderAction(sendId: string) {
  const { supabase, user } = await requireMemberAction();
  const admin = createSupabaseAdminClient();
  const id = sendId.trim();
  if (!id) throw new Error("Einladung fehlt.");

  const { data: openReview } = await admin
    .from("membership_referral_reviews")
    .select("id")
    .eq("referrer_user_id", user.id)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();
  if (openReview?.id) {
    throw new Error(
      "Das Versenden von Einladungen ist für dich vorübergehend pausiert. Bitte melde dich beim Vorstand, falls du Fragen hast.",
    );
  }

  const { data: send, error } = await admin
    .from("membership_referral_sends")
    .select(
      "id,sender_id,recipient_email,recipient_first_name,recipient_last_name,created_at,link_opened_at,approved_at,converted_application_id,referral_token,last_reminder_at,reminder_count",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (/last_reminder_at|reminder_count|does not exist/i.test(error.message)) {
      throw new Error(
        "Erinnerungen sind noch nicht freigeschaltet. Bitte zuerst supabase/124_membership_referral_reminders.sql ausführen.",
      );
    }
    throw new Error(error.message);
  }
  if (!send || send.sender_id !== user.id) {
    throw new Error("Einladung nicht gefunden.");
  }

  const eligibility = referralReminderEligibility({
    created_at: send.created_at,
    last_reminder_at: send.last_reminder_at ?? null,
    approved_at: send.approved_at ?? null,
    converted_application_id: send.converted_application_id ?? null,
  });
  if (!eligibility.canRemind) {
    if (eligibility.reason === "converted") {
      throw new Error("Diese Person ist bereits Mitglied — keine Erinnerung nötig.");
    }
    throw new Error(
      eligibility.nextAt
        ? `Erinnerung ist erst ab ${new Date(eligibility.nextAt).toLocaleDateString("de-DE", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })} wieder möglich.`
        : "Erinnerung ist gerade nicht möglich.",
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", user.id)
    .maybeSingle();
  const senderName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    "Ein Fanclub-Mitglied";

  const applicationLink = getMembershipApplicationFormUrlForReferrer(
    user.id,
    send.referral_token ?? null,
  );
  const recipientFirst =
    (send.recipient_first_name ?? "").trim() ||
    (send.recipient_email ?? "").split("@")[0] ||
    "du";

  const subject = memberReferralReminderSubject(senderName);
  const text = composeMemberReferralReminderBody({
    recipientFirstName: recipientFirst,
    senderName,
    applicationLink,
  });
  const html = buildMemberReferralReminderHtml(text);

  const result = await sendEmailWithLog({
    to: send.recipient_email,
    subject,
    text,
    html,
    bypassTestAllowlist: true,
    templateKey: EMAIL_TEMPLATE_KEYS.membershipReferralReminder,
    context: { kind: "member_referral_reminder", sender_id: user.id, send_id: send.id },
  });
  if (!result.ok) {
    throw new Error(describeEmailSendFailure(result));
  }

  const nowIso = new Date().toISOString();
  const { error: updErr } = await admin
    .from("membership_referral_sends")
    .update({
      last_reminder_at: nowIso,
      reminder_count: (send.reminder_count ?? 0) + 1,
    })
    .eq("id", send.id)
    .eq("sender_id", user.id);

  if (updErr) throw new Error(updErr.message);

  return { ok: true as const };
}
