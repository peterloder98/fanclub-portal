import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { EventsSyncPanel, type SyncLogSnapshot } from "./events-sync-panel.client";

export default async function AdminEventsSyncPage() {
  const { supabase } = await requireAdmin();

  const { data: lastLog } = await supabase
    .from("artistflow_sync_logs")
    .select("started_at,finished_at,total,inserted,updated,hidden,geocoding_queued,error")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen">
      <Topbar
        title="Event Synchronisation"
        subtitle="Konzerttermine abgleichen, Geocoding und Diagnose"
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <EventsSyncPanel initialLog={(lastLog as SyncLogSnapshot | null) ?? null} />
      </main>
    </div>
  );
}
