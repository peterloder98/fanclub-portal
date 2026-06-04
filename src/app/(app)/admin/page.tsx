import { Topbar } from "@/components/app-shell/topbar";
import { AdminHub } from "@/components/admin/admin-hub";

export default function AdminPage() {
  return (
    <div className="min-h-screen">
      <Topbar title="Admin" subtitle="Mitglieder, E-Mail, System und Events." />
      <main className="px-4 py-6 lg:px-8">
        <AdminHub />
      </main>
    </div>
  );
}
