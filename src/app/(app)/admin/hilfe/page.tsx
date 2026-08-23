import { Topbar } from "@/components/app-shell/topbar";
import { AdminHandbookPanel } from "@/components/admin/admin-handbook-panel";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminHilfePage() {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <Topbar title="Admin-Handbuch" subtitle="Bedienung und Überblick für den Vorstand" />
      <main className="px-4 py-6 lg:px-8">
        <AdminHandbookPanel />
      </main>
    </div>
  );
}
