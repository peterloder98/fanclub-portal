"use server";

import { redirect } from "next/navigation";
import { buildHtmlFromPlain } from "@/lib/email/build-html-from-plain";
import {
  MEMBER_REFERRAL_SUBJECT,
  composeMemberReferralBody,
} from "@/lib/email/member-referral-template";
import { getMembershipApplicationFormUrlForReferrer } from "@/lib/membership/referral-link";
import { awardMembershipReferralPoints } from "@/lib/points/award-membership-referral";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    subject: MEMBER_REFERRAL_SUBJECT,
    applicationLink,
    senderName,
    body: composeMemberReferralBody({
      recipientName: "",
      senderName: senderName || "…",
      applicationLink,
    }),
  };
}

export async function sendMemberReferralEmailAction(input: {
  to: string;
  recipientName: string;
  senderName: string;
  subject: string;
  body: string;
}) {
  const { user } = await requireMemberAction();

  const to = input.to.trim();
  const recipientName = input.recipientName.trim();
  const senderName = input.senderName.trim();
  if (!to || !to.includes("@")) {
    throw new Error("Bitte eine gültige E-Mail-Adresse eingeben.");
  }
  if (!recipientName) throw new Error("Bitte den Namen der Empfängerin / des Empfängers eingeben.");
  if (!senderName) throw new Error("Bitte deinen Namen als Absender/in eingeben.");

  const applicationLink = getMembershipApplicationFormUrlForReferrer(user.id);
  const subject = MEMBER_REFERRAL_SUBJECT;
  const text = composeMemberReferralBody({ recipientName, senderName, applicationLink });
  const html = buildHtmlFromPlain(text, "");

  const result = await sendEmailViaAccount({ to, subject, text, html });

  if (!result.ok) {
    if (result.skipped) {
      throw new Error(
        "E-Mail konnte nicht gesendet werden: Kein SMTP-Konto hinterlegt (Admin → E-Mail / SMTP).",
      );
    }
    throw new Error(result.error ?? "E-Mail konnte nicht gesendet werden (SMTP prüfen).");
  }

  const { awarded, points } = await awardMembershipReferralPoints(user.id, to);

  return { ok: true as const, pointsAwarded: awarded ? points : 0 };
}
