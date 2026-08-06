import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminLiveSessionsPanel } from "@/components/admin/admin-live-sessions.client";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LiveSessionRow } from "@/lib/live/types";

export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("live_sessions")
    .select(
      "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
    )
    .order("starts_at", { ascending: false })
    .limit(50);

  const sessions = (data ?? []) as LiveSessionRow[];

  return (
    <div className="min-h-screen">
      <Topbar
        title="Live mit Anni"
        subtitle="Sessions anlegen, Host-Link für Anni erzeugen und beenden."
      />
      <main className="px-4 py-6 lg:px-8">
        <div className="mb-4">
          <AdminBackLink />
        </div>
        <AdminLiveSessionsPanel sessions={sessions} />
      </main>
    </div>
  );
}
