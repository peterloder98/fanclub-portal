import { Topbar } from "@/components/app-shell/topbar";
import { AdminBoardVideoMeetingsPanel } from "@/components/admin/admin-board-video-meetings.client";
import { getRequestAuth } from "@/lib/auth/request-auth";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  loadAdminBoardMeetingOptions,
  loadAdminBoardMeetings,
} from "@/app/(app)/admin/besprechung/actions";

export const dynamic = "force-dynamic";

export default async function AdminBesprechungPage() {
  await requireAdmin();
  const { user } = await getRequestAuth();
  const [meetings, adminOptions] = await Promise.all([
    loadAdminBoardMeetings(),
    loadAdminBoardMeetingOptions(),
  ]);

  return (
    <>
      <Topbar title="Videobesprechung mit Anni" />
      <main className="mx-auto max-w-4xl px-3 py-4 sm:px-4 lg:px-6">
        <p className="mb-4 text-sm text-slate-600">
          Interne Video-Calls mit Anni und ausgewählten Vorständen — getrennt vom Fan-Live. Agenda vorab,
          Multi-Video, max. 1 Stunde.
        </p>
        <AdminBoardVideoMeetingsPanel
          meetings={meetings}
          adminOptions={adminOptions}
          currentUserId={user!.id}
        />
      </main>
    </>
  );
}
