import { Topbar } from "@/components/app-shell/topbar";
import { requireAdmin } from "@/lib/admin/require-admin";
import { EmailTemplatesClient } from "./email-templates.client";

export default async function AdminEmailTemplatesPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <Topbar
        title="E-Mail-Vorlagen"
        subtitle="Antragsbestätigung, Einladung Antragslink, Zahlungserinnerung — Signatur wird beim Versand ergänzt"
      />
      <main className="px-4 py-6 lg:px-8">
        <EmailTemplatesClient />
      </main>
    </div>
  );
}
