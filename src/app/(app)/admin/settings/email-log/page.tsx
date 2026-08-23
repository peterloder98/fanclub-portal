import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { EmailSendLogPanel } from "@/components/admin/email-send-log-panel.client";
import { listEmailSendLog } from "@/lib/email/send-log";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminEmailLogPage() {
  await requireAdmin();

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
