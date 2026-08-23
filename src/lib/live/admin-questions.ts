import type { SupabaseClient } from "@supabase/supabase-js";
import { profileDisplayName } from "@/lib/profiles/display";

export type AdminLiveQuestionRow = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
};

export async function loadOpenLiveSessionQuestions(
  admin: SupabaseClient,
  sessionId: string,
): Promise<AdminLiveQuestionRow[]> {
  const { data: questions, error } = await admin
    .from("live_session_questions")
    .select("id,body,created_at,author_id")
    .eq("session_id", sessionId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);

  const authorIds = [...new Set((questions ?? []).map((q) => q.author_id))];
  const { data: profiles } = authorIds.length
    ? await admin
        .from("profiles")
        .select("id,first_name,last_name,email")
        .in("id", authorIds)
    : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }> };

  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      profileDisplayName({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
      }),
    ]),
  );

  return (questions ?? []).map((q) => ({
    id: q.id,
    body: q.body,
    createdAt: q.created_at,
    authorId: q.author_id,
    authorName: nameById.get(q.author_id) ?? "Mitglied",
  }));
}

export async function loadOpenLiveQuestionsBySession(
  admin: SupabaseClient,
  sessionIds: string[],
): Promise<Record<string, AdminLiveQuestionRow[]>> {
  const out: Record<string, AdminLiveQuestionRow[]> = {};
  await Promise.all(
    sessionIds.map(async (sessionId) => {
      out[sessionId] = await loadOpenLiveSessionQuestions(admin, sessionId);
    }),
  );
  return out;
}
