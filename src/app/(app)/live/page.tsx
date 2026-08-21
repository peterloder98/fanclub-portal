import { Topbar } from "@/components/app-shell/topbar";
import { LiveMemberSessionView } from "@/components/live/live-member-session-view";
import { LiveSessionListCard } from "@/components/live/live-session-list-card";
import { getRequestAuth } from "@/lib/auth/request-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSessionDiscoverable, type LiveSessionRow } from "@/lib/live/types";
import {
  deleteGraceExpiredLiveSessions,
  endExpiredLiveSessions,
  syncLiveSessionLifecycle,
  LIVE_SESSION_SELECT,
} from "@/lib/live/cleanup";
import { loadLiveMemberRsvp } from "@/lib/live/load-member-rsvp";

export const dynamic = "force-dynamic";

const SESSION_COLS =
  "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at,grace_ends_at";

export default async function LiveIndexPage() {
  const admin = createSupabaseAdminClient();
  await endExpiredLiveSessions(admin);
  await deleteGraceExpiredLiveSessions(admin);

  const { supabase, user } = await getRequestAuth();
  const now = new Date().toISOString();

  let { data, error } = await supabase
    .from("live_sessions")
    .select(SESSION_COLS)
    .or(
      `and(status.in.(scheduled,live),ends_at.gte.${now}),and(status.eq.ended,grace_ends_at.gt.${now})`,
    )
    .order("starts_at", { ascending: true })
    .limit(20);

  if (error && /grace_ends_at/i.test(error.message)) {
    const fallback = await supabase
      .from("live_sessions")
      .select(
        "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
      )
      .in("status", ["scheduled", "live"])
      .gte("ends_at", now)
      .order("starts_at", { ascending: true })
      .limit(20);
    data = (fallback.data ?? []).map((s) => ({ ...s, grace_ends_at: null }));
    error = fallback.error;
  }

  if (error) {
    console.error("[live] index", error.message);
  }

  let sessions = ((data ?? []) as LiveSessionRow[]).filter((s) => isSessionDiscoverable(s));

  // Nächste Session: Lifecycle sync (Grace/Ende), ggf. aus der Liste nehmen
  if (sessions.length > 0) {
    const primary = sessions[0]!;
    const phase = await syncLiveSessionLifecycle(admin, primary);
    if (phase === "gone") {
      sessions = sessions.filter((s) => s.id !== primary.id);
    } else {
      const refreshed = await admin
        .from("live_sessions")
        .select(LIVE_SESSION_SELECT)
        .eq("id", primary.id)
        .maybeSingle();
      if (refreshed.data) {
        sessions = [
          refreshed.data as LiveSessionRow,
          ...sessions.filter((s) => s.id !== primary.id),
        ];
      }
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="min-h-screen">
        <Topbar title="Live" subtitle="Live-Sessions mit Anni" />
        <main className="mx-auto max-w-2xl px-4 py-6 lg:px-8">
          <div className="rounded-2xl border border-fc-navy/15 bg-white px-5 py-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
              Live mit Anni
            </p>
            <p className="mt-2 text-lg font-semibold text-fc-navy">Aktuell kein Termin</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Gerade steht noch kein neuer Live-Chat-Termin fest. Sobald es soweit ist, siehst du
              hier die Einladung mit Datum, Countdown und Raum — und wir informieren die Mitglieder
              per E-Mail.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const [featured, ...others] = sessions;
  const rsvpStatus =
    user && featured ? await loadLiveMemberRsvp(supabase, featured, user.id) : null;

  return (
    <div className="min-h-screen">
      <Topbar
        title={featured!.title}
        subtitle={others.length > 0 ? "Nächster Live-Termin" : "Live mit Anni"}
      />
      <main className="pb-8">
        <LiveMemberSessionView
          session={featured!}
          rsvpStatus={rsvpStatus}
          variant="embedded"
        />
        {others.length > 0 ? (
          <section className="mx-auto mt-2 max-w-2xl px-3 sm:px-4">
            <h2 className="mb-3 text-sm font-semibold text-fc-navy">Weitere Termine</h2>
            <ul className="space-y-3">
              {others.map((s) => (
                <li key={s.id}>
                  <LiveSessionListCard session={s} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
