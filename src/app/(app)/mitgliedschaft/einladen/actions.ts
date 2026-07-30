"use server";

import { redirect } from "next/navigation";
import {
  memberReferralSubject,
  composeMemberReferralBody,
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
import { awardMembershipReferralPoints } from "@/lib/points/award-membership-referral";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
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

  return {
    subject: memberReferralSubject(senderName),
    applicationLink,
    senderName,
    body: composeMemberReferralBody({
      recipientFirstName: "",
      senderName: senderName || "…",
      applicationLink,
    }),
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
}) {
  const { user } = await requireMemberAction();
  const admin = createSupabaseAdminClient();

  const to = input.to.trim();
  const recipientFirstName = input.recipientFirstName.trim();
  const recipientLastName = input.recipientLastName.trim();
  const recipientGender = input.recipientGender.trim();
  const senderName = input.senderName.trim();
  if (!to || !to.includes("@")) {
    throw new Error("Bitte eine gültige E-Mail-Adresse eingeben.");
  }
  if (!recipientFirstName) throw new Error("Bitte den Vornamen der Empfängerin / des Empfängers eingeben.");
  if (!recipientLastName) throw new Error("Bitte den Nachnamen der Empfängerin / des Empfängers eingeben.");
  if (recipientGender !== "m" && recipientGender !== "w") {
    throw new Error("Bitte Geschlecht wählen (für Anrede).");
  }
  if (!senderName) throw new Error("Bitte deinen Namen als Absender/in eingeben.");

  const limit = await assertReferralSendAllowed(admin, user.id, to);
  if (!limit.ok) throw new Error(limit.message);

  const { awarded, points, referralToken } = await awardMembershipReferralPoints(user.id, to, {
    firstName: recipientFirstName,
    lastName: recipientLastName,
    gender: recipientGender,
  });

  const applicationLink = getMembershipApplicationFormUrlForReferrer(user.id, referralToken);
  const subject = memberReferralSubject(senderName);
  const text = composeMemberReferralBody({
    recipientFirstName,
    senderName,
    applicationLink,
  });
  const html = buildMemberReferralHtml(text);

  const result = await sendEmailViaAccount({ to, subject, text, html });

  if (!result.ok) {
    if (result.skipped) {
      throw new Error(
        "E-Mail konnte nicht gesendet werden: Kein SMTP-Konto hinterlegt (Admin → E-Mail / SMTP).",
      );
    }
    throw new Error(result.error ?? "E-Mail konnte nicht gesendet werden (SMTP prüfen).");
  }

  void evaluateAndMaybeFlagReferrer(admin, user.id).catch((e) =>
    console.error("[referral-abuse] after send:", e),
  );

  return { ok: true as const, pointsAwarded: awarded ? points : 0 };
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

  const result = await sendEmailViaAccount({
    to: send.recipient_email,
    subject,
    text,
    html,
  });
  if (!result.ok) {
    if (result.skipped) {
      throw new Error(
        "E-Mail konnte nicht gesendet werden: Kein SMTP-Konto hinterlegt (Admin → E-Mail / SMTP).",
      );
    }
    throw new Error(result.error ?? "E-Mail konnte nicht gesendet werden (SMTP prüfen).");
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
