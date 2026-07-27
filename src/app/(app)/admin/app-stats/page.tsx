import { redirect } from "next/navigation";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AppStatsPanel } from "@/components/admin/app-stats-panel.client";
import { Topbar } from "@/components/app-shell/topbar";
import { loadAppStats } from "@/app/(app)/admin/app-stats/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminAppStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { month } = await searchParams;
  let stats;
  try {
    stats = await loadAppStats(month);
  } catch (e) {
    return (
      <div className="min-h-screen">
        <Topbar title="App-Statistik" subtitle="Nutzung der Fanclub-App" />
        <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
          <AdminBackLink />
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {e instanceof Error ? e.message : "Statistik konnte nicht geladen werden."}
            <p className="mt-2 text-amber-800">
              Falls die Tabellen noch fehlen: bitte{" "}
              <code className="rounded bg-white/70 px-1">supabase/103_member_portal_intro_and_app_activity.sql</code>{" "}
              im Supabase SQL Editor ausführen.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Topbar
        title="App-Statistik"
        subtitle="Aktive Mitglieder, App-Nutzung und Monatstrends — nur für Admins."
      />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
        <AdminBackLink />
        <AppStatsPanel stats={stats} />
      </main>
    </div>
  );
}
