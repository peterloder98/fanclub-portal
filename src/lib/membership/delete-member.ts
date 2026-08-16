import type { SupabaseClient } from "@supabase/supabase-js";
import {
  collectPaymentIds,
  deletePaymentsForIds,
  deleteMembershipApplicationCompletely,
} from "@/lib/membership/delete-application";

function deError(prefix: string, message: string) {
  return new Error(`${prefix}: ${message}`);
}

/**
 * Mitglied/Konto vollständig löschen — inkl. offener Zahlungen
 * (payments.user_id → profiles ON DELETE RESTRICT).
 */
export async function deleteMemberCompletely(admin: SupabaseClient, userId: string) {
  const id = userId.trim();
  if (!id) throw new Error("Mitglied fehlt.");

  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id,role,first_name,last_name,membership_number")
    .eq("id", id)
    .maybeSingle();
  if (pErr) throw deError("Profil laden", pErr.message);
  if (!profile) throw new Error("Mitglied nicht gefunden.");
  if (profile.role === "admin") {
    throw new Error("Vorstands-Konten können hier nicht gelöscht werden.");
  }

  // Digitale Anträge dieses Kontos zuerst (inkl. Zahlungen/PDFs)
  const { data: apps, error: appsErr } = await admin
    .from("membership_applications")
    .select("id")
    .eq("user_id", id);
  if (appsErr && !/does not exist/i.test(appsErr.message)) {
    throw deError("Anträge laden", appsErr.message);
  }
  for (const app of apps ?? []) {
    await deleteMembershipApplicationCompletely(admin, app.id);
  }

  // Offene/übrige Zahlungen (z. B. manuell angelegt ohne Antrag)
  const paymentIds = await collectPaymentIds(admin, { userId: id });
  await deletePaymentsForIds(admin, paymentIds);

  // Shop-Bestellungen blockieren sonst (ON DELETE RESTRICT)
  const { data: orders, error: ordErr } = await admin
    .from("merchandise_orders")
    .select("id")
    .eq("user_id", id);
  if (ordErr && !/does not exist|merchandise_orders/i.test(ordErr.message)) {
    throw deError("Bestellungen laden", ordErr.message);
  }
  if ((orders ?? []).length > 0) {
    throw new Error(
      "Mitglied hat Shop-Bestellungen. Bitte diese zuerst unter Zahlungen/Shop klären, danach erneut löschen.",
    );
  }

  const { error: memErr } = await admin.from("memberships").delete().eq("user_id", id);
  if (memErr && !/does not exist/i.test(memErr.message)) {
    throw deError("Mitgliedschaft", memErr.message);
  }

  const { error: logErr } = await admin.from("member_activity_log").delete().eq("user_id", id);
  if (logErr && !/does not exist/i.test(logErr.message)) {
    throw deError("Historie", logErr.message);
  }

  // Profil kann schon durch Antrags-Löschung weg sein
  const { data: stillThere } = await admin.from("profiles").select("id").eq("id", id).maybeSingle();
  if (stillThere) {
    const { error: profErr } = await admin.from("profiles").delete().eq("id", id);
    if (profErr) throw deError("Profil", profErr.message);
  }

  const { error: authErr } = await admin.auth.admin.deleteUser(id);
  if (authErr && !/User not found|not found/i.test(authErr.message)) {
    throw deError("Benutzerkonto", authErr.message);
  }

  return {
    deletedUserId: id,
    name: `${profile.first_name} ${profile.last_name}`.trim(),
  };
}
