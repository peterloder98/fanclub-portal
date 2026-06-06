import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  generateMembershipPdf,
  type MembershipApplicationPdfData,
} from "@/lib/membership/generate-membership-pdf";
import { MEMBERSHIP_NUMBER_PENDING_LABEL } from "@/lib/membership/numbers";

const BUCKET = "membership-signatures";

function cachedPdfPath(applicationId: string) {
  return `${applicationId}/application.pdf`;
}

async function buildPdfForApplication(
  applicationId: string,
  membershipNumber?: string | null,
) {
  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("membership_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Antrag nicht gefunden.");

  let signaturePng: Uint8Array | null = null;
  if (row.signature_applicant_path) {
    const { data: file, error: dlErr } = await admin.storage
      .from(BUCKET)
      .download(row.signature_applicant_path);
    if (!dlErr && file) {
      signaturePng = new Uint8Array(await file.arrayBuffer());
    }
  }

  const data: MembershipApplicationPdfData = {
    id: row.id,
    membership_number: membershipNumber?.trim() || MEMBERSHIP_NUMBER_PENDING_LABEL,
    first_name: row.first_name,
    last_name: row.last_name,
    birthdate: row.birthdate,
    gender: row.gender,
    street: row.street,
    postal_code: row.postal_code,
    city: row.city,
    country: row.country,
    phone: row.phone,
    mobile_dial_code: row.mobile_dial_code,
    mobile_number: row.mobile_number,
    email: row.email,
    membership_start_date: row.membership_start_date,
    whatsapp_opt_in: row.whatsapp_opt_in,
    privacy_accepted: row.privacy_accepted,
    whatsapp_dial_code: row.whatsapp_dial_code,
    whatsapp_number: row.whatsapp_number,
    signed_at_place: row.signed_at_place,
    signed_at_date: row.signed_at_date,
    instagram: row.instagram,
    facebook: row.facebook,
  };

  return generateMembershipPdf(data, signaturePng);
}

/** Generate once and store in Supabase Storage for fast preview. */
export async function cacheApplicationPdf(
  applicationId: string,
  membershipNumber?: string | null,
) {
  const admin = createSupabaseAdminClient();
  const path = cachedPdfPath(applicationId);
  const bytes = await buildPdfForApplication(applicationId, membershipNumber);

  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upErr) throw new Error(upErr.message);

  await admin
    .from("membership_applications")
    .update({ application_pdf_path: path })
    .eq("id", applicationId);

  return path;
}

/** Regenerate contract PDF with assigned membership number and store on profile. */
export async function storeApprovedMemberContractPdf(
  userId: string,
  applicationId: string,
  membershipNumber: string,
) {
  const admin = createSupabaseAdminClient();
  const bytes = await buildPdfForApplication(applicationId, membershipNumber);
  const appPath = cachedPdfPath(applicationId);
  const contractPath = `${userId}/contract.pdf`;

  const { error: appUpErr } = await admin.storage.from(BUCKET).upload(appPath, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (appUpErr) throw new Error(appUpErr.message);

  const { error: contractUpErr } = await admin.storage.from(BUCKET).upload(contractPath, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (contractUpErr) throw new Error(contractUpErr.message);

  const { error: appRowErr } = await admin
    .from("membership_applications")
    .update({ application_pdf_path: appPath })
    .eq("id", applicationId);
  if (appRowErr) throw new Error(appRowErr.message);

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ contract_pdf_path: contractPath })
    .eq("id", userId);
  if (profileErr) throw new Error(profileErr.message);

  return contractPath;
}

export async function loadApplicationPdfBytes(applicationId: string) {
  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("membership_applications")
    .select("application_pdf_path")
    .eq("id", applicationId)
    .maybeSingle();

  const path = row?.application_pdf_path ?? cachedPdfPath(applicationId);
  const { data: cached, error: dlErr } = await admin.storage.from(BUCKET).download(path);

  if (!dlErr && cached) {
    return new Uint8Array(await cached.arrayBuffer());
  }

  const bytes = await buildPdfForApplication(applicationId);
  void cacheApplicationPdf(applicationId).catch((e) => {
    console.warn("[pdf] Hintergrund-Cache fehlgeschlagen:", e);
  });
  return bytes;
}
