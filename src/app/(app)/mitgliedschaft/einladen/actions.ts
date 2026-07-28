"use server";

import { redirect } from "next/navigation";
import {
  memberReferralSubject,
  composeMemberReferralBody,
  buildMemberReferralHtml,
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

  return { ok: true as const, pointsAwarded: awarded ? points : 0 };
}
