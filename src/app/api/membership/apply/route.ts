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
import { seedSmtpFromEnvIfEmpty } from "@/lib/smtp/accounts";

const digitsOnly = z.string().regex(/^\d+$/, "Nur Ziffern erlaubt");
const postalCode = z.string().regex(/^\d{5}$/, "PLZ muss genau 5 Ziffern haben");

const schema = z
  .object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    birthdate: z.string().min(1),
    gender: z.string().optional(),
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
    await seedSmtpFromEnvIfEmpty().catch((e) => {
      console.warn("[smtp] Seed übersprungen:", e);
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

    const { error: insErr } = await admin.from("membership_applications").insert({
      id: appId,
      user_id: userId,
      status: "submitted",
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      birthdate: input.birthdate,
      gender: input.gender?.trim() || null,
      street: input.street.trim(),
      postal_code: input.postal_code.trim(),
      city: input.city.trim(),
      country: input.country.trim(),
      country_code: input.country_code?.trim().toUpperCase() || null,
      phone: input.phone.trim(),
      mobile_dial_code: input.mobile_dial_code.trim(),
      mobile_number: input.mobile_number.trim(),
      email: input.email.trim().toLowerCase(),
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
    const email = input.email.trim().toLowerCase();
    const submittedAt = new Date().toISOString();

    let emailWarning: string | null = null;

    try {
      await cacheApplicationPdf(appId);
    } catch (e) {
      console.warn("[membership] PDF-Cache fehlgeschlagen:", e);
    }

    try {
      const applicantMail = await sendApplicantConfirmationEmail({
        applicationId: appId,
        email,
        firstName: input.first_name.trim(),
        lastName: input.last_name.trim(),
        feeCents: 1500,
      });
      if (!applicantMail.ok && applicantMail.skipped) {
        emailWarning = "Bestätigungs-E-Mail: SMTP nicht konfiguriert.";
      }
    } catch (e) {
      console.error("[membership] Bestätigungs-Mail fehlgeschlagen:", e);
      emailWarning = "Bestätigungs-E-Mail konnte nicht gesendet werden.";
    }

    try {
      const adminMail = await notifyAdminsNewMembershipApplication({
        applicationId: appId,
        applicantName,
        email,
        submittedAt,
      });
      if (!adminMail.sent && adminMail.reason === "no_smtp_account") {
        emailWarning = emailWarning
          ? `${emailWarning} Admin-Benachrichtigung: SMTP fehlt.`
          : "Admin-Benachrichtigung: SMTP nicht konfiguriert.";
      }
    } catch (e) {
      console.error("[membership] Admin-Benachrichtigung fehlgeschlagen:", e);
      emailWarning = emailWarning
        ? `${emailWarning} Admin-Mail fehlgeschlagen.`
        : "Admin-Benachrichtigung fehlgeschlagen.";
    }

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
