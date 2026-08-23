import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminLiveQuestionsPanel } from "@/components/admin/admin-live-questions-panel";
import { AdminLiveSessionsPanel } from "@/components/admin/admin-live-sessions.client";
import { requireAdmin } from "@/lib/admin/require-admin";
import { loadOpenLiveQuestionsBySession } from "@/lib/live/admin-questions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LiveSessionRow } from "@/lib/live/types";

export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("live_sessions")
    .select(
      "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
    )
    .order("starts_at", { ascending: false })
    .limit(50);

  const sessions = (data ?? []) as LiveSessionRow[];
  const activeSessionIds = sessions.filter((s) => s.status !== "cancelled").map((s) => s.id);

  let questionsBySessionId: Record<string, Awaited<
    ReturnType<typeof loadOpenLiveQuestionsBySession>
  >[string]> = {};
  let questionsPanelError: string | null = null;

  if (activeSessionIds.length) {
    try {
      questionsBySessionId = await loadOpenLiveQuestionsBySession(admin, activeSessionIds);
    } catch (e) {
      questionsPanelError =
        e instanceof Error ? e.message : "Fragen konnten nicht geladen werden.";
    }
  }

  const openQuestionCountBySessionId: Record<string, number> = {};
  for (const [sessionId, rows] of Object.entries(questionsBySessionId)) {
    openQuestionCountBySessionId[sessionId] = rows.length;
  }

  return (
    <div className="min-h-screen">
      <Topbar
        title="Live mit Anni"
        subtitle="Sessions anlegen, Fan-Fragen moderieren, Host-Link für Anni."
      />
      <main className="px-4 py-6 lg:px-8">
        <div className="mb-4">
          <AdminBackLink />
        </div>

        {questionsPanelError ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Fan-Fragen: {questionsPanelError}
          </div>
        ) : (
          <AdminLiveQuestionsPanel
            sessions={sessions}
            questionsBySessionId={questionsBySessionId}
          />
        )}

        <AdminLiveSessionsPanel
          sessions={sessions}
          openQuestionCountBySessionId={openQuestionCountBySessionId}
        />
      </main>
    </div>
  );
}
