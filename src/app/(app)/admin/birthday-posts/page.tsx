import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listBirthdayTemplatePreviews } from "@/lib/birthday/templates";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminBirthdayPostsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  const templates = listBirthdayTemplatePreviews();

  return (
    <div className="min-h-screen">
      <Topbar
        title="Geburtstagsposts"
        subtitle="5 rotierende Vorlagen · täglich 08:00 · angeheftet bis 23:59"
      />
      <main className="px-4 py-6 lg:px-8">
        <Link href="/admin" className="text-sm font-medium text-blue-600 hover:underline">
          ← Admin
        </Link>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Ablauf</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>
              Pro Geburtstagskind wird täglich um <strong>08:00 Uhr (Berlin)</strong> ein Post
              erstellt (Autor: „Anni Perka Fanclub“). Die Vorlage wird aus den fünf Texten unten
              per Hash aus Mitglied-ID und Datum gewählt — gleiches Kind, gleicher Tag = immer
              dieselbe Vorlage.
            </p>
            <p>
              Der Post bleibt bis <strong>23:59 Uhr</strong> oben angeheftet, danach sortiert er
              sich nach Aktivität (neue Kommentare heben ihn wieder nach oben).
            </p>
            <p className="text-slate-500">
              Cron: <code className="rounded bg-slate-100 px-1">/api/cron/birthday-posts</code>
            </p>
          </CardContent>
        </Card>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.index}>
              <CardHeader>
                <CardTitle className="text-base">
                  Vorlage {t.index} <span className="font-normal text-slate-500">(Beispiel Max)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-semibold text-slate-900">{t.title}</p>
                <p className="text-slate-700">{t.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
