import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "membership-signatures";

function deError(prefix: string, message: string) {
  return new Error(`${prefix}: ${message}`);
}

export async function deletePaymentsForIds(admin: SupabaseClient, paymentIds: string[]) {
  for (const paymentId of paymentIds) {
    const { error: auditErr } = await admin
      .from("payment_audit_log")
      .delete()
      .eq("payment_id", paymentId);
    if (auditErr && !/does not exist/i.test(auditErr.message)) {
      throw deError("Zahlungs-Protokoll", auditErr.message);
    }

    // Buchungen hart löschen; Fallback: Verknüpfung lösen (FK ON DELETE SET NULL)
    const { error: ledErr } = await admin
      .from("club_ledger_entries")
      .delete()
      .eq("payment_id", paymentId);
    if (ledErr && !/does not exist/i.test(ledErr.message)) {
      const { error: unlinkErr } = await admin
        .from("club_ledger_entries")
        .update({ payment_id: null })
        .eq("payment_id", paymentId);
      if (unlinkErr && !/does not exist/i.test(unlinkErr.message)) {
        throw deError("Buchhaltung", ledErr.message);
      }
    }

    const { error: payErr } = await admin.from("payments").delete().eq("id", paymentId);
    if (payErr) throw deError("Zahlung", payErr.message);
  }
}

export async function collectPaymentIds(
  admin: SupabaseClient,
  opts: { applicationId?: string; userId?: string },
): Promise<string[]> {
  const ids = new Set<string>();

  if (opts.applicationId) {
    const { data, error } = await admin
      .from("payments")
      .select("id")
      .eq("application_id", opts.applicationId);
    if (error) {
      if (!/application_id|does not exist/i.test(error.message)) {
        throw deError("Zahlungen laden", error.message);
      }
    } else {
      for (const row of data ?? []) ids.add(row.id);
    }
  }

  if (opts.userId) {
    const { data, error } = await admin.from("payments").select("id").eq("user_id", opts.userId);
    if (error) {
      if (!/does not exist/i.test(error.message)) {
        throw deError("Zahlungen laden", error.message);
      }
    } else {
      for (const row of data ?? []) ids.add(row.id);
    }
  }

  return Array.from(ids);
}

export async function purgeApplicationStorage(
  admin: SupabaseClient,
  applicationId: string,
  extraPaths: (string | null | undefined)[],
) {
  const paths = new Set<string>();
  for (const p of extraPaths) {
    if (p?.trim()) paths.add(p.trim());
  }

  const { data: listed, error: listErr } = await admin.storage
    .from(BUCKET)
    .list(applicationId, { limit: 200 });
  // Storage-Fehler sollen das DB-Löschen nicht blockieren
  if (listErr) {
    console.warn("[delete-application] storage list:", listErr.message);
  }
  for (const f of listed ?? []) {
    if (f.name) paths.add(`${applicationId}/${f.name}`);
  }

  if (paths.size) {
    const { error } = await admin.storage.from(BUCKET).remove(Array.from(paths));
    if (error) {
      console.warn("[delete-application] storage remove:", error.message);
    }
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
  if (appErr) throw deError("Antrag laden", appErr.message);
  if (!app) throw new Error("Antrag nicht gefunden.");

  await purgeApplicationStorage(admin, applicationId, [
    app.signature_applicant_path,
    app.signature_guardian_path,
    app.application_pdf_path,
    `${applicationId}/application.pdf`,
    `${applicationId}/applicant.png`,
  ]);

  const { error: actErr } = await admin
    .from("member_activity_log")
    .delete()
    .eq("application_id", applicationId);
  if (actErr && !/does not exist/i.test(actErr.message)) {
    throw deError("Historie", actErr.message);
  }

  // Zahlungen zuerst (FK payments.user_id → profiles ON DELETE RESTRICT)
  const paymentIds = await collectPaymentIds(admin, {
    applicationId,
    userId: app.user_id ?? undefined,
  });
  await deletePaymentsForIds(admin, paymentIds);

  const userId = app.user_id;
  const { error: delAppErr } = await admin
    .from("membership_applications")
    .delete()
    .eq("id", applicationId);
  if (delAppErr) throw deError("Antrag löschen", delAppErr.message);

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
      // Nochmal: Zahlungen ohne application_id / nachträglich entstanden
      const orphanIds = await collectPaymentIds(admin, { userId });
      await deletePaymentsForIds(admin, orphanIds);

      const { error: memErr } = await admin.from("memberships").delete().eq("user_id", userId);
      if (memErr) throw deError("Mitgliedschaft", memErr.message);

      const { error: logErr } = await admin
        .from("member_activity_log")
        .delete()
        .eq("user_id", userId);
      if (logErr && !/does not exist/i.test(logErr.message)) {
        throw deError("Historie", logErr.message);
      }

      const { error: profErr } = await admin.from("profiles").delete().eq("id", userId);
      if (profErr) throw deError("Profil", profErr.message);

      const { error: authErr } = await admin.auth.admin.deleteUser(userId);
      if (authErr) throw deError("Benutzerkonto", authErr.message);
    }
  }

  return { deletedApplicationId: applicationId, deletedUserId: userId ?? null };
}
