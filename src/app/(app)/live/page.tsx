import Link from "next/link";
import { Topbar } from "@/components/app-shell/topbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canMembersJoinSession, isSessionDiscoverable, type LiveSessionRow } from "@/lib/live/types";

export const dynamic = "force-dynamic";

export default async function LiveIndexPage() {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("live_sessions")
    .select(
      "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
    )
    .in("status", ["scheduled", "live"])
    .gte("ends_at", now)
    .order("starts_at", { ascending: true })
    .limit(20);

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
                          {new Date(s.starts_at).toLocaleString("de-DE")}
                        </p>
                      </div>
                      <span
                        className={
                          s.status === "live" || open
                            ? "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800"
                            : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                        }
                      >
                        {s.status === "live" ? "Jetzt live" : open ? "Raum offen" : "Geplant"}
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
