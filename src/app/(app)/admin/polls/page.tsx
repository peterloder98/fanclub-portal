import { Topbar } from "@/components/app-shell/topbar";
import { requireAdmin } from "@/lib/admin/require-admin";
import { AdminPollForm } from "./admin-poll-form";

export default async function AdminPollsPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <Topbar title="Umfrage erstellen" subtitle="Admin: Frage, Optionen, Enddatum." />
      <main className="px-4 py-6 lg:px-8">
        <AdminPollForm />
      </main>
    </div>
  );
}
