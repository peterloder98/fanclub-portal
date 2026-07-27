"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { auditLog } from "@/lib/admin/audit-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncProfileMapCoords } from "@/lib/members/geocode-profile";
import { logMemberActivity, MEMBER_ACTIVITY_TYPES } from "@/lib/membership/activity-log";
import {
  PROFILE_CHANGE_FIELDS,
  type ProfileChangeField,
  type ProfileChangeValues,
} from "@/lib/profile/change-requests";
import { notifyMemberProfileChangeResult } from "@/lib/email/profile-change-notify";
import { deleteNotificationsByMetadata } from "@/lib/notifications/cleanup";

export async function approveProfileChangeRequest(requestId: string) {
  const { user } = await requireAdmin();
  const admin = createSupabaseAdminClient();

  const { data: row, error } = await admin
    .from("profile_change_requests")
    .select("id,user_id,proposed,status")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row || row.status !== "pending") {
    throw new Error("Anfrage nicht gefunden oder bereits bearbeitet.");
  }

  const proposed = (row.proposed ?? {}) as Partial<ProfileChangeValues>;
  const patch: Record<string, string | null> = {};
  for (const field of PROFILE_CHANGE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(proposed, field)) {
      patch[field] = proposed[field as ProfileChangeField] ?? null;
    }
  }

  if (Object.keys(patch).length) {
    const { error: updErr } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", row.user_id);
    if (updErr) throw new Error(updErr.message);
    await syncProfileMapCoords(admin, row.user_id);
  }

  const { error: stErr } = await admin
    .from("profile_change_requests")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", requestId);
  if (stErr) throw new Error(stErr.message);

  await logMemberActivity({
    userId: row.user_id,
    eventType: MEMBER_ACTIVITY_TYPES.profileChangeApproved,
    title: "Stammdaten-Änderung freigegeben",
    details: "Der Vorstand hat die Änderungen bestätigt.",
    createdBy: user.id,
    metadata: { request_id: requestId, fields: Object.keys(patch) },
  });

  await notifyMemberProfileChangeResult({ userId: row.user_id, approved: true }).catch(
    console.error,
  );
  await deleteNotificationsByMetadata("request_id", requestId).catch(() => null);

  await auditLog({
    actorId: user.id,
    action: "profile_change.approve",
    entityType: "profile_change_request",
    entityId: requestId,
    summary: "Stammdaten-Änderung freigegeben",
    metadata: { user_id: row.user_id, fields: Object.keys(patch) },
  });

  revalidatePath("/admin/members/profile-changes");
  revalidatePath("/profile");
  revalidatePath(`/admin/members/${row.user_id}`);
}

export async function rejectProfileChangeRequest(requestId: string) {
  const { user } = await requireAdmin();
  const admin = createSupabaseAdminClient();

  const { data: row, error } = await admin
    .from("profile_change_requests")
    .select("id,user_id,status")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row || row.status !== "pending") {
    throw new Error("Anfrage nicht gefunden oder bereits bearbeitet.");
  }

  const { error: stErr } = await admin
    .from("profile_change_requests")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", requestId);
  if (stErr) throw new Error(stErr.message);

  await logMemberActivity({
    userId: row.user_id,
    eventType: MEMBER_ACTIVITY_TYPES.profileChangeRejected,
    title: "Stammdaten-Änderung abgelehnt",
    details: "Der Vorstand hat die Änderungen nicht freigegeben.",
    createdBy: user.id,
    metadata: { request_id: requestId },
  });

  await notifyMemberProfileChangeResult({ userId: row.user_id, approved: false }).catch(
    console.error,
  );
  await deleteNotificationsByMetadata("request_id", requestId).catch(() => null);

  await auditLog({
    actorId: user.id,
    action: "profile_change.reject",
    entityType: "profile_change_request",
    entityId: requestId,
    summary: "Stammdaten-Änderung abgelehnt",
    metadata: { user_id: row.user_id },
  });

  revalidatePath("/admin/members/profile-changes");
  revalidatePath("/profile");
}
