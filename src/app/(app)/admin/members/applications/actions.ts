"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMemberInviteAfterApproval } from "@/lib/email/membership-notify";

export async function approveMembershipApplication(applicationId: string) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const { data: app, error: appErr } = await admin
    .from("membership_applications")
    .select("id,user_id,email,first_name,status")
    .eq("id", applicationId)
    .maybeSingle();

  if (appErr) throw new Error(appErr.message);
  if (!app) throw new Error("Antrag nicht gefunden.");
  if (!app.user_id) {
    throw new Error("Kein Benutzerkonto verknüpft — Antrag kann nicht freigeschaltet werden.");
  }

  const { data: membership } = await admin
    .from("memberships")
    .select("id,status")
    .eq("user_id", app.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.id) throw new Error("Mitgliedschaft nicht gefunden.");

  const { error: mErr } = await admin
    .from("memberships")
    .update({ status: "active" })
    .eq("id", membership.id);
  if (mErr) throw new Error(mErr.message);

  await admin
    .from("membership_applications")
    .update({ status: "approved" })
    .eq("id", applicationId);

  await admin.auth.admin.updateUserById(app.user_id, { email_confirm: true });

  if (app.email) {
    await sendMemberInviteAfterApproval({
      email: app.email,
      firstName: app.first_name?.trim() || "Fan",
    }).catch((e) => {
      console.error("[membership] Freischaltungs-Mail fehlgeschlagen:", e);
    });
  }

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/applications/${applicationId}`);
  redirect(`/admin/members/applications/${applicationId}?approved=1`);
}
