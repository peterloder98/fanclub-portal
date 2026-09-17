import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAnniManagementFinanceAction } from "@/lib/anni-management/require";
import { ANNI_MGMT_DOCS_BUCKET } from "@/lib/anni-management/types";
import { looksLikePdfUpload, validateReceiptUpload } from "@/lib/security/upload-validation";
import { RECEIPT_PDF_MAX_BYTES } from "@/lib/images/specs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAnniManagementFinanceAction();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "forbidden";
    const status = /angemeldet/i.test(msg) ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  const form = await request.formData();
  const file = form.get("file");
  const jobId = String(form.get("jobId") ?? "").trim();
  if (!jobId) return NextResponse.json({ error: "jobId fehlt." }, { status: 400 });
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "PDF fehlt." }, { status: 400 });
  }
  const fileName = file instanceof File ? file.name : "rechnung.pdf";
  if (!looksLikePdfUpload(file, fileName)) {
    return NextResponse.json({ error: "Bitte eine PDF-Datei hochladen." }, { status: 400 });
  }
  const uploadErr = await validateReceiptUpload(file, {
    maxBytes: RECEIPT_PDF_MAX_BYTES,
    pdfMaxBytes: RECEIPT_PDF_MAX_BYTES,
    label: "Rechnung",
    fileName,
  });
  if (uploadErr) return NextResponse.json({ error: uploadErr }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: job } = await admin.from("anni_mgmt_jobs").select("id,invoice_pdf_path").eq("id", jobId).maybeSingle();
  if (!job) return NextResponse.json({ error: "Job nicht gefunden." }, { status: 404 });

  const objectPath = `invoices/${jobId}/${Date.now()}.pdf`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage.from(ANNI_MGMT_DOCS_BUCKET).upload(objectPath, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  if (job.invoice_pdf_path && job.invoice_pdf_path !== objectPath) {
    await admin.storage.from(ANNI_MGMT_DOCS_BUCKET).remove([job.invoice_pdf_path]).catch(() => null);
  }
  const { error: updErr } = await admin
    .from("anni_mgmt_jobs")
    .update({ invoice_pdf_path: objectPath, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, path: objectPath });
}

export async function GET(request: Request) {
  try {
    await requireAnniManagementFinanceAction();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "forbidden";
    const status = /angemeldet/i.test(msg) ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  const path = new URL(request.url).searchParams.get("path");
  if (!path || path.includes("..") || !path.startsWith("invoices/")) {
    return NextResponse.json({ error: "Pfad ungültig." }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from(ANNI_MGMT_DOCS_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Datei nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ url: data.signedUrl });
}

export async function DELETE(request: Request) {
  try {
    await requireAnniManagementFinanceAction();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "forbidden";
    const status = /angemeldet/i.test(msg) ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId fehlt." }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: job } = await admin.from("anni_mgmt_jobs").select("invoice_pdf_path").eq("id", jobId).maybeSingle();
  if (job?.invoice_pdf_path) {
    await admin.storage.from(ANNI_MGMT_DOCS_BUCKET).remove([job.invoice_pdf_path]).catch(() => null);
  }
  await admin.from("anni_mgmt_jobs").update({ invoice_pdf_path: null, updated_at: new Date().toISOString() }).eq("id", jobId);
  return NextResponse.json({ ok: true });
}
