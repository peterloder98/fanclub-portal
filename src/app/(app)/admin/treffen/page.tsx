import Link from "next/link";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { MeetingAdminForm } from "@/components/meetings/meeting-admin-form.client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminTreffenPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createSupabaseAdminClient();
  const { data: meetings, error } = await admin
    .from("club_meetings")
    .select("id,title,starts_at,status,city")
    .order("starts_at", { ascending: false })
    .limit(30);

  return (
    <div className="min-h-screen">
      <Topbar title="Fanclub Treffen" subtitle="Admin — Termine anlegen und veröffentlichen" />
      <main className="mx-auto max-w-3xl px-4 py-4 lg:px-6">
        <AdminBackLink href="/admin" label="Admin" />
        {error?.message.includes("club_meetings") ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Bitte zuerst <code className="rounded bg-white px-1">supabase/066_club_meetings.sql</code>{" "}
            in Supabase ausführen.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Neues Treffen anlegen</CardTitle>
              </CardHeader>
              <CardContent>
                <MeetingAdminForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alle Treffen</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {(meetings ?? []).length ? (
                  (meetings ?? []).map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-fc-navy">{m.title}</p>
                        <p className="text-xs text-[color:var(--muted)]">
                          {new Date(m.starts_at).toLocaleString("de-DE")} · {m.city ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.status === "published" ? "success" : "neutral"}>
                          {m.status}
                        </Badge>
                        <Link
                          href={`/admin/treffen/${m.id}`}
                          className="text-xs font-medium text-fc-blue hover:underline"
                        >
                          Teilnehmer
                        </Link>
                        {m.status === "published" ? (
                          <Link
                            href={`/treffen/${m.id}`}
                            className="text-xs font-medium text-fc-blue hover:underline"
                          >
                            Ansehen
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[color:var(--muted)]">Noch keine Treffen angelegt.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
