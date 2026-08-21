import Link from "next/link";
import { Topbar } from "@/components/app-shell/topbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  canMembersJoinSession,
  isInLiveGracePeriod,
  isSessionDiscoverable,
  type LiveSessionRow,
} from "@/lib/live/types";
import { deleteGraceExpiredLiveSessions, endExpiredLiveSessions } from "@/lib/live/cleanup";
import { formatBerlinDateTime } from "@/lib/datetime/berlin";

export const dynamic = "force-dynamic";

export default async function LiveIndexPage() {
  const admin = createSupabaseAdminClient();
  await endExpiredLiveSessions(admin);
  await deleteGraceExpiredLiveSessions(admin);

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  let { data, error } = await supabase
    .from("live_sessions")
    .select(
      "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at,grace_ends_at",
    )
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

  const sessions = ((data ?? []) as LiveSessionRow[]).filter((s) => isSessionDiscoverable(s));

  return (
    <div className="min-h-screen">
      <Topbar title="Live" subtitle="Live-Sessions mit Anni" />
      <main className="mx-auto max-w-2xl px-4 py-6 lg:px-8">
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-700 shadow-sm">
            <p className="font-medium text-fc-navy">Aktuell kein Termin</p>
            <p className="mt-2 leading-relaxed">
              Aktuell steht noch kein neuer Live-Chat-Termin mit Anni fest. Sobald es soweit ist,
              werden die Mitglieder so schnell wie möglich informiert.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => {
              const open = canMembersJoinSession(s);
              const grace = isInLiveGracePeriod(s);
              return (
                <li key={s.id}>
                  <Link
                    href={`/live/${s.slug}`}
                    className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-fc-navy/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-fc-navy">{s.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatBerlinDateTime(s.starts_at)}
                        </p>
                      </div>
                      <span
                        className={
                          grace
                            ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900"
                            : s.status === "live" || open
                              ? "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800"
                              : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                        }
                      >
                        {grace
                          ? "Nachlauf"
                          : s.status === "live"
                            ? "Jetzt live"
                            : open
                              ? "Raum offen"
                              : "Geplant"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
