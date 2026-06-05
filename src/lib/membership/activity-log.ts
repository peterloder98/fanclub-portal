import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const MEMBER_ACTIVITY_TYPES = {
  applicationSubmitted: "application_submitted",
  applicationRejected: "application_rejected",
  applicationDeleted: "application_deleted",
  paymentReminderSent: "payment_reminder_sent",
  membershipApproved: "membership_approved",
  paymentReceived: "payment_received",
  warningIssued: "warning_issued",
  warningRevoked: "warning_revoked",
  ledgerIncome: "ledger_income",
  ledgerExpense: "ledger_expense",
  profileSelfUpdated: "profile_self_updated",
  memberCreated: "member_created",
  memberDeleted: "member_deleted",
  note: "note",
} as const;

export type MemberActivityType =
  (typeof MEMBER_ACTIVITY_TYPES)[keyof typeof MEMBER_ACTIVITY_TYPES];

export type LogMemberActivityInput = {
  userId?: string | null;
  applicationId?: string | null;
  eventType: MemberActivityType;
  title: string;
  details?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logMemberActivity(input: LogMemberActivityInput): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("member_activity_log")
    .insert({
      user_id: input.userId ?? null,
      application_id: input.applicationId ?? null,
      event_type: input.eventType,
      title: input.title,
      details: input.details ?? null,
      link_url: input.linkUrl ?? null,
      link_label: input.linkLabel ?? null,
      created_by: input.createdBy ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export type MemberActivityRow = {
  id: string;
  event_type: string;
  title: string;
  details: string | null;
  link_url: string | null;
  link_label: string | null;
  created_at: string;
  created_by_name: string | null;
  metadata: Record<string, unknown>;
};

export async function listMemberActivity(opts: {
  userId?: string | null;
  applicationId?: string | null;
  limit?: number;
}): Promise<MemberActivityRow[]> {
  const admin = createSupabaseAdminClient();
  let q = admin
    .from("member_activity_log")
    .select("id,event_type,title,details,link_url,link_label,created_at,created_by,metadata")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.userId) q = q.eq("user_id", opts.userId);
  if (opts.applicationId) q = q.eq("application_id", opts.applicationId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const creatorIds = Array.from(
    new Set((data ?? []).map((r) => r.created_by).filter(Boolean)),
  ) as string[];
  const { data: creators } = creatorIds.length
    ? await admin.from("profiles").select("id,first_name,last_name").in("id", creatorIds)
    : { data: [] };
  const nameById = new Map(
    (creators ?? []).map((p) => [
      p.id,
      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Admin",
    ]),
  );

  return (data ?? []).map((r) => ({
    id: r.id,
    event_type: r.event_type,
    title: r.title,
    details: r.details,
    link_url: r.link_url,
    link_label: r.link_label,
    created_at: r.created_at,
    created_by_name: r.created_by ? (nameById.get(r.created_by) ?? null) : null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }));
}

export function activityTypeLabel(type: string) {
  const map: Record<string, string> = {
    application_submitted: "Antrag eingegangen",
    application_rejected: "Antrag abgelehnt",
    application_deleted: "Antrag gelöscht",
    payment_reminder_sent: "Zahlungserinnerung",
    membership_approved: "Mitgliedschaft freigegeben",
    payment_received: "Beitrag eingegangen",
    warning_issued: "Verwarnung",
    warning_revoked: "Verwarnung zurückgenommen",
    ledger_income: "Einnahme",
    ledger_expense: "Ausgabe",
    profile_self_updated: "Daten geändert (Mitglied)",
    member_created: "Mitglied angelegt",
    member_deleted: "Mitglied gelöscht",
    note: "Notiz",
  };
  return map[type] ?? type;
}
