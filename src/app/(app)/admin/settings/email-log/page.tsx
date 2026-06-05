import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { EmailSendLogPanel } from "@/components/admin/email-send-log-panel.client";
import { listEmailSendLog } from "@/lib/email/send-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminEmailLogPage() {
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

  const { rows, available } = await listEmailSendLog(100);

  return (
    <div className="min-h-screen">
      <Topbar title="E-Mail-Historie" subtitle="Versand, Fehler und erneutes Senden." />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <div className="mt-4">
          <EmailSendLogPanel rows={rows} available={available} />
        </div>
      </main>
    </div>
  );
}
