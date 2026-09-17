"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAnniManagementFinanceAction,
  requireAnniManagementInviteAction,
} from "@/lib/anni-management/require";
import { autoKmNetCents, parseEurToCents } from "@/lib/anni-management/money";
import { monthSettlementPreview } from "@/lib/anni-management/calc";
import { loadAnniMgmtFinanceBundle } from "@/lib/anni-management/queries";
import { ANNI_MGMT_FINANCE_PATH } from "@/lib/anni-management/access";
import {
  DEFAULT_TRAVEL_TO_CLIENT_CENTS,
  JOB_LINE_KIND_LABELS,
  TRAVEL_MODES,
  TRAVELERS,
  type JobLineKind,
} from "@/lib/anni-management/types";
import { sendAppAccessSetupEmail } from "@/lib/email/app-access-setup";
import { isRealMemberEmail } from "@/lib/email/is-real-member-email";
import { slugifyMemberUsername } from "@/lib/members/username";

function revalidate() {
  revalidatePath(ANNI_MGMT_FINANCE_PATH);
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format JJJJ-MM-TT.");

const lineKindSchema = z.enum(
  Object.keys(JOB_LINE_KIND_LABELS) as [JobLineKind, ...JobLineKind[]],
);

const jobLineInputSchema = z.object({
  id: z.string().uuid().optional(),
  line_kind: lineKindSchema,
  income_type: z.string().trim().max(80).nullable().optional(),
  amount_eur: z.string().optional(),
  amount_cents: z.number().int().nonnegative().optional(),
  traveler: z.enum(TRAVELERS).nullable().optional(),
  travel_mode: z.enum(TRAVEL_MODES).nullable().optional(),
  km: z.number().nonnegative().nullable().optional(),
  route_description: z.string().trim().max(500).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

const jobInputSchema = z.object({
  id: z.string().uuid().optional(),
  performance_date: isoDate,
  label: z.string().trim().min(1, "Bezeichnung fehlt.").max(200),
  description: z.string().trim().max(4000).nullable().optional(),
  invoice_due_date: isoDate,
  invoice_sent: z.boolean(),
  invoice_sent_at: isoDate.nullable().optional(),
  paid: z.boolean(),
  paid_at: isoDate.nullable().optional(),
  lines: z.array(jobLineInputSchema).max(80),
  addDefaultTravelToClient: z.boolean().optional(),
});

function resolveLineAmountCents(line: z.infer<typeof jobLineInputSchema>): number {
  if (line.travel_mode === "auto" && line.km != null && line.km > 0) {
    return autoKmNetCents(line.km);
  }
  if (typeof line.amount_cents === "number") return line.amount_cents;
  const parsed = parseEurToCents(line.amount_eur ?? "");
  if (parsed == null) throw new Error("Betrag ungültig.");
  return parsed;
}

export async function saveAnniMgmtJobAction(
  input: z.infer<typeof jobInputSchema>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const gate = await requireAnniManagementFinanceAction();
    const parsed = jobInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
    }
    const data = parsed.data;
    if (data.paid && !data.paid_at) {
      return { ok: false, error: "Bei bezahlt bitte das Zahlungsdatum angeben." };
    }
    const admin = createSupabaseAdminClient();
    const nowIso = new Date().toISOString();

    const jobPayload = {
      performance_date: data.performance_date,
      label: data.label,
      description: data.description?.trim() || null,
      invoice_due_date: data.invoice_due_date,
      invoice_sent: data.invoice_sent,
      invoice_sent_at: data.invoice_sent ? data.invoice_sent_at || data.performance_date : null,
      paid: data.paid,
      paid_at: data.paid ? data.paid_at : null,
      updated_at: nowIso,
    };

    let jobId: string;
    if (data.id) {
      const { error } = await admin.from("anni_mgmt_jobs").update(jobPayload).eq("id", data.id);
      if (error) return { ok: false, error: error.message };
      jobId = data.id;
    } else {
      const { data: created, error } = await admin
        .from("anni_mgmt_jobs")
        .insert({ ...jobPayload, created_by: gate.userId })
        .select("id")
        .single();
      if (error || !created?.id) return { ok: false, error: error?.message ?? "Job konnte nicht angelegt werden." };
      jobId = created.id as string;
    }

    let lines = [...data.lines];
    if (!data.id && data.addDefaultTravelToClient !== false) {
      const hasTravel = lines.some((l) => l.line_kind === "travel_to_client");
      if (!hasTravel) {
        lines.push({
          line_kind: "travel_to_client",
          amount_cents: DEFAULT_TRAVEL_TO_CLIENT_CENTS,
        });
      }
    }

    const { data: existingLines } = await admin
      .from("anni_mgmt_job_lines")
      .select("id")
      .eq("job_id", jobId);
    const keepIds = new Set(lines.map((l) => l.id).filter(Boolean));
    const toDelete = (existingLines ?? []).map((l) => l.id).filter((id) => !keepIds.has(id));
    if (toDelete.length) {
      await admin.from("anni_mgmt_job_lines").delete().in("id", toDelete);
    }

    for (const line of lines) {
      const amount_cents = resolveLineAmountCents(line);
      const row = {
        job_id: jobId,
        line_kind: line.line_kind,
        income_type: line.line_kind === "income" ? line.income_type?.trim() || "Gage" : null,
        amount_cents,
        traveler:
          line.line_kind === "expense_travel" || line.line_kind === "expense_other"
            ? line.traveler ?? "anni"
            : null,
        travel_mode: line.line_kind === "expense_travel" ? line.travel_mode ?? "other" : null,
        km: line.travel_mode === "auto" ? line.km ?? null : null,
        route_description: line.route_description?.trim() || null,
        note: line.note?.trim() || null,
      };
      if (line.id) {
        const { error } = await admin.from("anni_mgmt_job_lines").update(row).eq("id", line.id);
        if (error) return { ok: false, error: error.message };
      } else {
        const { error } = await admin.from("anni_mgmt_job_lines").insert(row);
        if (error) return { ok: false, error: error.message };
      }
    }

    if (data.lines.some((l) => l.line_kind === "income" && l.income_type?.trim())) {
      for (const label of data.lines
        .filter((l) => l.line_kind === "income")
        .map((l) => l.income_type?.trim())
        .filter((v): v is string => Boolean(v))) {
        await admin.from("anni_mgmt_income_types").upsert({ label }, { onConflict: "label" });
      }
    }

    revalidate();
    return { ok: true, id: jobId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}

export async function deleteAnniMgmtJobAction(
  jobId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAnniManagementFinanceAction();
    const admin = createSupabaseAdminClient();
    const { data: job } = await admin
      .from("anni_mgmt_jobs")
      .select("invoice_pdf_path")
      .eq("id", jobId)
      .maybeSingle();
    const { error } = await admin.from("anni_mgmt_jobs").delete().eq("id", jobId);
    if (error) return { ok: false, error: error.message };
    if (job?.invoice_pdf_path) {
      await admin.storage.from("anni-management-docs").remove([job.invoice_pdf_path]).catch(() => null);
    }
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Löschen fehlgeschlagen." };
  }
}

export async function addPoolPayoutAction(input: {
  payout_date: string;
  amount_eur: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const gate = await requireAnniManagementFinanceAction();
    const date = isoDate.safeParse(input.payout_date);
    if (!date.success) return { ok: false, error: "Datum ungültig." };
    const cents = parseEurToCents(input.amount_eur);
    if (!cents || cents <= 0) return { ok: false, error: "Betrag ungültig." };
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("anni_mgmt_pool_payouts").insert({
      payout_date: date.data,
      amount_cents: cents,
      note: input.note?.trim() || "Ausschüttung an Anni",
      created_by: gate.userId,
    });
    if (error) return { ok: false, error: error.message };
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}

export async function deletePoolPayoutAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAnniManagementFinanceAction();
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("anni_mgmt_pool_payouts").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Löschen fehlgeschlagen." };
  }
}

export async function markManagementTravelReimbursedAction(input: {
  lineIds: string[];
  year: number;
  month: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAnniManagementFinanceAction();
    if (!input.lineIds.length) return { ok: false, error: "Keine Positionen ausgewählt." };
    if (input.month < 1 || input.month > 12) return { ok: false, error: "Monat ungültig." };
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("anni_mgmt_job_lines")
      .update({
        reimbursed_at: new Date().toISOString(),
        reimbursed_year: input.year,
        reimbursed_month: input.month,
      })
      .in("id", input.lineIds)
      .eq("line_kind", "expense_travel")
      .eq("traveler", "management");
    if (error) return { ok: false, error: error.message };
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}

export async function settleAnniMgmtMonthAction(input: {
  year: number;
  month: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const gate = await requireAnniManagementFinanceAction();
    const bundle = await loadAnniMgmtFinanceBundle();
    if (!bundle.schemaReady) return { ok: false, error: "Tabelle fehlt noch — bitte SQL 160 ausführen." };
    const preview = monthSettlementPreview(bundle.jobs, input.year, input.month);
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("anni_mgmt_month_settlements").upsert(
      {
        year: input.year,
        month: input.month,
        income_base_cents: preview.paidIncomeBaseCents,
        fee_cents: preview.feeCents,
        management_travel_cents: preview.managementTravelCents,
        total_cents: preview.totalInvoiceCents,
        settled_at: new Date().toISOString(),
        settled_by: gate.userId,
      },
      { onConflict: "year,month" },
    );
    if (error) return { ok: false, error: error.message };

    const travelIds = preview.managementTravelLines.map((l) => l.id);
    if (travelIds.length) {
      await admin
        .from("anni_mgmt_job_lines")
        .update({
          reimbursed_at: new Date().toISOString(),
          reimbursed_year: input.year,
          reimbursed_month: input.month,
        })
        .in("id", travelIds);
    }
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}

export async function addIncomeTypeAction(
  label: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAnniManagementFinanceAction();
    const trimmed = label.trim();
    if (!trimmed) return { ok: false, error: "Bezeichnung fehlt." };
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("anni_mgmt_income_types").upsert(
      { label: trimmed },
      { onConflict: "label" },
    );
    if (error) return { ok: false, error: error.message };
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}

function splitPersonName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "Management" };
  if (parts.length === 1) return { first: parts[0]!, last: "Management" };
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

export async function inviteAnniManagementUserAction(input: {
  name: string;
  email: string;
}): Promise<{ ok: true; setupUrl?: string } | { ok: false; error: string }> {
  try {
    await requireAnniManagementInviteAction();
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name) return { ok: false, error: "Name fehlt." };
    if (!isRealMemberEmail(email)) return { ok: false, error: "Bitte eine gültige E-Mail angeben." };

    const { first, last } = splitPersonName(name);
    const admin = createSupabaseAdminClient();
    const nowIso = new Date().toISOString();

    const { data: existing } = await admin
      .from("profiles")
      .select("id,role,is_management,is_hidden,first_name,email")
      .ilike("email", email)
      .maybeSingle();

    if (existing && !existing.is_management && existing.role !== "anni") {
      return {
        ok: false,
        error:
          "Diese E-Mail gehört bereits zu einem Mitglieder- oder Vorstandskonto. Bitte eine eigene Management-Adresse verwenden.",
      };
    }

    let userId = existing?.id as string | undefined;
    if (!userId) {
      const username = slugifyMemberUsername(first, last);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: crypto.randomUUID() + "A1",
        email_confirm: true,
        user_metadata: {
          role: "member",
          username,
          first_name: first,
          last_name: last,
        },
      });
      if (createErr || !created.user) {
        return { ok: false, error: createErr?.message ?? "Konto konnte nicht angelegt werden." };
      }
      userId = created.user.id;
    }

    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: userId,
        role: existing?.role === "anni" ? "anni" : "member",
        ...(existing ? {} : { username: slugifyMemberUsername(first, last) }),
        email,
        first_name: first,
        last_name: last,
        is_hidden: true,
        is_management: true,
        intro_onboarding_dismissed_at: nowIso,
        community_rules_accepted_at: nowIso,
        app_registration_status: "open",
      },
      { onConflict: "id" },
    );
    if (profileErr) {
      if (/is_management|is_hidden|does not exist/i.test(profileErr.message)) {
        return {
          ok: false,
          error: "Datenbank-Spalte fehlt. Bitte supabase/160_anni_management_finance.sql ausführen.",
        };
      }
      return { ok: false, error: profileErr.message };
    }

    const mailed = await sendAppAccessSetupEmail({
      email,
      firstName: first,
      userId,
      forceSetup: true,
      logContext: { source: "anni_management_invite" },
    });

    revalidate();
    return {
      ok: true,
      setupUrl: "setupUrl" in mailed ? mailed.setupUrl : undefined,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Einladung fehlgeschlagen." };
  }
}

export async function resendAnniManagementInviteAction(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAnniManagementInviteAction();
    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id,email,first_name,is_management")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.is_management) return { ok: false, error: "Kein Management-Konto." };
    if (!isRealMemberEmail(profile.email)) {
      return { ok: false, error: "Für den Versand wird eine E-Mail-Adresse benötigt." };
    }
    await sendAppAccessSetupEmail({
      email: profile.email,
      firstName: profile.first_name ?? "Hallo",
      userId: profile.id,
      forceSetup: true,
      logContext: { source: "anni_management_invite_resend" },
    });
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Versand fehlgeschlagen." };
  }
}
