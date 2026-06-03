import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "membership-signatures";

export async function purgeApplicationStorage(
  admin: SupabaseClient,
  applicationId: string,
  extraPaths: (string | null | undefined)[],
) {
  const paths = new Set<string>();
  for (const p of extraPaths) {
    if (p?.trim()) paths.add(p.trim());
  }

  const { data: listed } = await admin.storage.from(BUCKET).list(applicationId, { limit: 200 });
  for (const f of listed ?? []) {
    if (f.name) paths.add(`${applicationId}/${f.name}`);
  }

  if (paths.size) {
    const { error } = await admin.storage.from(BUCKET).remove(Array.from(paths));
    if (error) throw new Error(`Storage: ${error.message}`);
  }
}

export async function deleteMembershipApplicationCompletely(
  admin: SupabaseClient,
  applicationId: string,
) {
  const { data: app, error: appErr } = await admin
    .from("membership_applications")
    .select(
      "id,user_id,signature_applicant_path,signature_guardian_path,application_pdf_path",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (appErr) throw new Error(appErr.message);
  if (!app) throw new Error("Antrag nicht gefunden.");

  await purgeApplicationStorage(admin, applicationId, [
    app.signature_applicant_path,
    app.signature_guardian_path,
    app.application_pdf_path,
    `${applicationId}/application.pdf`,
    `${applicationId}/applicant.png`,
  ]);

  await admin.from("member_activity_log").delete().eq("application_id", applicationId);

  const userId = app.user_id;
  const { error: delAppErr } = await admin
    .from("membership_applications")
    .delete()
    .eq("id", applicationId);
  if (delAppErr) throw new Error(delAppErr.message);

  if (userId) {
    const { data: membership } = await admin
      .from("memberships")
      .select("status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: profile } = await admin
      .from("profiles")
      .select("role,membership_number")
      .eq("id", userId)
      .maybeSingle();

    const onlyApplicant =
      membership?.status === "applied" &&
      profile?.role === "member" &&
      !profile?.membership_number;

    if (onlyApplicant) {
      await admin.from("memberships").delete().eq("user_id", userId);
      await admin.from("member_activity_log").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("id", userId);
      const { error: authErr } = await admin.auth.admin.deleteUser(userId);
      if (authErr) throw new Error(authErr.message);
    }
  }

  return { deletedApplicationId: applicationId, deletedUserId: userId ?? null };
}
