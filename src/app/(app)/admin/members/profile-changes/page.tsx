import { Suspense } from "react";
import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { ProfileChangesQueue } from "@/components/admin/profile-changes-queue.client";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import type { ProfileChangeValues } from "@/lib/profile/change-requests";

export default async function AdminProfileChangesPage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const { data: pending } = await admin
    .from("profile_change_requests")
    .select("id,user_id,previous,proposed,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);

  const rows = pending ?? [];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = userIds.length
    ? await admin
        .from("profiles")
        .select("id,first_name,last_name,membership_number,avatar_path,updated_at")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        name:
          p.first_name && p.last_name
            ? `${p.first_name} ${p.last_name}`
            : "Mitglied",
        membershipNumber: p.membership_number as string | null,
        avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
      },
    ]),
  );

  const queue = rows.map((r) => {
    const p = profileMap.get(r.user_id);
    return {
      id: r.id,
      created_at: r.created_at,
      userId: r.user_id,
      membershipNumber: p?.membershipNumber ?? null,
      memberName: p?.name ?? "Mitglied",
      memberAvatarUrl: p?.avatarUrl ?? null,
      previous: (r.previous ?? {}) as Partial<ProfileChangeValues>,
      proposed: (r.proposed ?? {}) as Partial<ProfileChangeValues>,
    };
  });

  return (
    <div className="min-h-full">
      <Topbar
        title="Stammdaten freigeben"
        subtitle="Mitglieder-Änderungen prüfen und bestätigen"
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <AdminBackLink href="/admin" label="← Admin" />
        <p className="text-sm text-slate-600">
          Änderungen an Stammdaten werden erst nach Freigabe in den Profildaten
          hinterlegt. Ablehnungen belassen die bisherigen Werte.
        </p>
        <Suspense fallback={null}>
          <ProfileChangesQueue rows={queue} />
        </Suspense>
      </div>
    </div>
  );
}
