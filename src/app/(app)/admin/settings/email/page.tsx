import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { SmtpSettingsClient } from "./smtp-settings.client";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function AdminEmailSettingsPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <Topbar title="E-Mail / SMTP" subtitle="Versandkonten für Anträge und Benachrichtigungen" />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <div className="mt-4">
          <SmtpSettingsClient />
        </div>
      </main>
    </div>
  );
}
