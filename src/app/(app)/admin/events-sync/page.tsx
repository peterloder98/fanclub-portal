import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EventsSyncPanel, type SyncLogSnapshot } from "./events-sync-panel.client";

export default async function AdminEventsSyncPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: lastLog } = await supabase
    .from("artistflow_sync_logs")
    .select("started_at,finished_at,total,inserted,updated,hidden,geocoding_queued,error")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen">
      <Topbar
        title="Artistflow Sync"
        subtitle="Sync, Reparatur (Teilnehmer & Pins) und Geocoding"
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <EventsSyncPanel initialLog={(lastLog as SyncLogSnapshot | null) ?? null} />
      </main>
    </div>
  );
}
