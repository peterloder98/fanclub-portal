import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  notifyAdminsNewMembershipApplication,
  sendApplicantConfirmationEmail,
} from "@/lib/email/membership-notify";
import { createMembershipDownloadToken } from "@/lib/membership/download-token";
import { cacheApplicationPdf } from "@/lib/membership/application-pdf-service";
import { logMemberActivity, MEMBER_ACTIVITY_TYPES } from "@/lib/membership/activity-log";
import { provisionMembershipApplicant } from "@/lib/membership/provision-applicant";
import { isValidPostalCode } from "@/lib/postal-code";
import {
  prepareSmtpForSend,
} from "@/lib/smtp/prepare-send";
import { formatMembershipEmailWarning } from "@/lib/smtp/email-warning";
import { resolveMembershipReferrer } from "@/lib/membership/resolve-referrer";
import { notifyReferrerApplicationSubmitted } from "@/lib/email/referrer-application-submitted";

const digitsOnly = z.string().regex(/^\d+$/, "Nur Ziffern erlaubt");
const postalCode = z.string().regex(/^\d{5}$/, "PLZ muss genau 5 Ziffern haben");

const schema = z
  .object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    birthdate: z.string().min(1),
    gender: z.enum(["m", "w", "d"], {
      message: "Bitte Geschlecht wählen (für Anrede).",
    }),
    street: z.string().min(1),
    postal_code: postalCode,
    city: z.string().min(1),
    country: z.string().min(1),
    country_code: z.string().length(2).optional(),
    phone: z.string().min(1),
    mobile_dial_code: z.string().min(1),
    mobile_number: digitsOnly.min(5),
    email: z.string().email(),
    membership_start_date: z.string().optional(),
    account_holder: z.string().optional(),
    iban: z.string().optional(),
    bic: z.string().optional(),
    privacy_accepted: z.literal(true),
    statute_accepted: z.literal(true),
    media_consent: z.boolean().optional(),
    whatsapp_opt_in: z.boolean(),
    whatsapp_dial_code: z.string().optional(),
    whatsapp_number: z.string().optional(),
    signed_at_place: z.string().min(1),
    signed_at_date: z.string().min(1),
    signature_applicant: z.string().min(1),
    referrer_user_id: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.whatsapp_opt_in) {
      const parsed = digitsOnly.safeParse(data.whatsapp_number ?? "");
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "WhatsApp-Nummer erforderlich (nur Ziffern)",
          path: ["whatsapp_number"],
        });
      }
      if (!data.whatsapp_dial_code?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "WhatsApp-Vorwahl erforderlich",
          path: ["whatsapp_dial_code"],
        });
      }
    }
  });

function dataUrlToBuffer(dataUrl: string) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Ungültiges Signatur-Bild");
  return { contentType: m[1], buffer: Buffer.from(m[2], "base64") };
}

function formatApiError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Antrag fehlgeschlagen";
}

function formatSubmittedAtDe(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  if (!isValidPostalCode(input.postal_code)) {
    return NextResponse.json({ error: "PLZ muss genau 5 Ziffern haben." }, { status: 400 });
  }

  const birth = new Date(input.birthdate);
  if (Number.isNaN(birth.getTime())) {
    return NextResponse.json({ error: "Ungültiges Geburtsdatum" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const appId = crypto.randomUUID();

  try {
    await prepareSmtpForSend().catch((e) => {
      console.warn("[smtp] Vorbereitung übersprungen:", e);
    });
    const applicantBuf = dataUrlToBuffer(input.signature_applicant);
    const applicantPath = `${appId}/applicant.png`;
    const { error: up1 } = await admin.storage
      .from("membership-signatures")
      .upload(applicantPath, applicantBuf.buffer, {
        contentType: applicantBuf.contentType,
        upsert: true,
      });
    if (up1) {
      const hint = up1.message.includes("Bucket not found")
        ? "Storage-Bucket fehlt. Bitte `supabase/018_membership_storage_workflow.sql` in Supabase ausführen."
        : up1.message;
      return NextResponse.json({ error: hint }, { status: 500 });
    }

    const { userId } = await provisionMembershipApplicant(admin, {
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      birthdate: input.birthdate,
      gender: input.gender,
      street: input.street,
      postal_code: input.postal_code,
      city: input.city,
      country: input.country,
      country_code: input.country_code,
      phone: input.phone,
      membership_start_date: input.membership_start_date,
    });

    const signedDate = new Date(input.signed_at_date);
    if (Number.isNaN(signedDate.getTime())) {
      return NextResponse.json({ error: "Ungültiges Datum" }, { status: 400 });
    }

    const emailNorm = input.email.trim().toLowerCase();
    const referredByUserId = await resolveMembershipReferrer(
      admin,
      emailNorm,
      input.referrer_user_id,
    );

    const { error: insErr } = await admin.from("membership_applications").insert({
      id: appId,
      user_id: userId,
      status: "submitted",
      referred_by_user_id: referredByUserId,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      birthdate: input.birthdate,
      gender: input.gender,
      street: input.street.trim(),
      postal_code: input.postal_code.trim(),
      city: input.city.trim(),
      country: input.country.trim(),
      country_code: input.country_code?.trim().toUpperCase() || null,
      phone: input.phone.trim(),
      mobile_dial_code: input.mobile_dial_code.trim(),
      mobile_number: input.mobile_number.trim(),
      email: emailNorm,
      membership_start_date: input.membership_start_date || null,
      account_holder: input.account_holder?.trim() || null,
      iban: input.iban?.trim() || null,
      bic: input.bic?.trim() || null,
      privacy_accepted: true,
      statute_accepted: true,
      media_consent: Boolean(input.media_consent),
      whatsapp_opt_in: input.whatsapp_opt_in,
      whatsapp_dial_code: input.whatsapp_opt_in ? input.whatsapp_dial_code?.trim() ?? null : null,
      whatsapp_number: input.whatsapp_opt_in ? input.whatsapp_number?.trim() ?? null : null,
      fee_cents: 1500,
      signature_applicant_path: applicantPath,
      signature_guardian_path: null,
      signed_at_place: input.signed_at_place.trim(),
      signed_at_date: input.signed_at_date,
    });

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const applicantName = `${input.first_name.trim()} ${input.last_name.trim()}`;
    const email = emailNorm;
    const submittedAt = new Date().toISOString();

    if (referredByUserId) {
      await admin
        .from("membership_referral_sends")
        .update({ application_id: appId })
        .eq("sender_id", referredByUserId)
        .ilike("recipient_email", email)
        .is("application_id", null);

      try {
        const notifyResult = await notifyReferrerApplicationSubmitted({
          referrerUserId: referredByUserId,
          applicantFirstName: input.first_name.trim(),
          applicantLastName: input.last_name.trim(),
        });
        if (notifyResult.ok) {
          await admin
            .from("membership_applications")
            .update({ referrer_notified_at: submittedAt })
            .eq("id", appId);
        }
      } catch (e) {
        console.error("[membership] Werber-Benachrichtigung fehlgeschlagen:", e);
      }
    }

    let applicantMailResult:
      | { ok: true; skipped: false }
      | { ok: false; skipped: boolean; error?: string }
      | null = null;
    let adminMailResult: Awaited<
      ReturnType<typeof notifyAdminsNewMembershipApplication>
    > | null = null;

    try {
      await cacheApplicationPdf(appId);
    } catch (e) {
      console.warn("[membership] PDF-Cache fehlgeschlagen:", e);
    }

    try {
      applicantMailResult = await sendApplicantConfirmationEmail({
        applicationId: appId,
        email,
        firstName: input.first_name.trim(),
        lastName: input.last_name.trim(),
        feeCents: 1500,
      });
    } catch (e) {
      console.error("[membership] Bestätigungs-Mail fehlgeschlagen:", e);
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      applicantMailResult = { ok: false, skipped: false, error: msg };
    }

    try {
      adminMailResult = await notifyAdminsNewMembershipApplication({
        applicationId: appId,
        applicantName,
        email,
        submittedAt,
      });
    } catch (e) {
      console.error("[membership] Admin-Benachrichtigung fehlgeschlagen:", e);
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      adminMailResult = { sent: false, reason: "send_failed", error: msg };
    }

    const emailWarning = formatMembershipEmailWarning({
      applicant: applicantMailResult ?? undefined,
      admin: adminMailResult ?? undefined,
    });

    const appBase = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
    await logMemberActivity({
      userId,
      applicationId: appId,
      eventType: MEMBER_ACTIVITY_TYPES.applicationSubmitted,
      title: "Mitgliedschaftsantrag eingereicht",
      details: `Digital eingereicht am ${formatSubmittedAtDe(submittedAt)}.`,
      linkUrl: appBase ? `${appBase}/admin/members/applications/${appId}` : null,
      linkLabel: "Antrag ansehen",
    }).catch((e) => console.warn("[activity] Antrag nicht protokolliert:", e));

    const downloadToken = createMembershipDownloadToken(appId);
    const pdfPath = `/api/membership/applications/${appId}/pdf?token=${encodeURIComponent(downloadToken)}`;
    const pdfDownloadUrl = appBase ? `${appBase}${pdfPath}` : pdfPath;

    return NextResponse.json({
      ok: true,
      id: appId,
      userId,
      pdfDownloadUrl,
      applicantName,
      emailWarning,
    });
  } catch (e) {
    return NextResponse.json({ error: formatApiError(e) }, { status: 500 });
  }
}
