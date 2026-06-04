import Link from "next/link";
import { Topbar } from "@/components/app-shell/topbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminAuditPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: rows } = await supabase
    .from("admin_audit_log")
    .select("id,action,summary,entity_type,entity_id,created_at,actor_id")
    .order("created_at", { ascending: false })
    .limit(100);

  const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id,first_name,last_name,email")
        .in("id", actorIds)
    : { data: [] };
  const actorName = new Map(
    (actors ?? []).map((a) => [
      a.id,
      a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : (a.email ?? "Admin"),
    ]),
  );

  const dateFmt = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen">
      <Topbar title="Admin-Audit" subtitle="Wer hat was im Vorstand-Bereich geändert?" />
      <main className="mx-auto w-full max-w-4xl px-4 py-6 lg:px-8">
        <Link
          href="/admin"
          className="mb-4 inline-flex text-sm font-medium text-blue-700 hover:underline"
        >
          ← Admin-Übersicht
        </Link>
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Zeit</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Aktion</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-slate-500">
                    Noch keine Einträge — nach Migration 043 und Admin-Aktionen erscheinen sie hier.
                  </td>
                </tr>
              ) : (
                (rows ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {dateFmt.format(new Date(r.created_at))}
                    </td>
                    <td className="px-4 py-3">
                      {r.actor_id ? actorName.get(r.actor_id) ?? "—" : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.action}</td>
                    <td className="px-4 py-3 text-slate-700">{r.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
