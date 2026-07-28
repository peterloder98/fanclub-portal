import { redirect } from "next/navigation";
import { Topbar } from "@/components/app-shell/topbar";
import { AdminHandbookPanel } from "@/components/admin/admin-handbook-panel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminHilfePage() {
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

  return (
    <div className="min-h-screen">
      <Topbar title="Admin-Handbuch" subtitle="Bedienung und Überblick für den Vorstand" />
      <main className="px-4 py-6 lg:px-8">
        <AdminHandbookPanel />
      </main>
    </div>
  );
}
