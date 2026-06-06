import { Suspense } from "react";
import { Topbar } from "@/components/app-shell/topbar";
import { VotingBoard } from "@/components/votings/voting-board";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createVoting } from "./actions";

export default async function VotingsPage() {
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
  const isAdmin = me?.role === "admin";

  const { data: initialVotings } = await supabase
    .from("votings")
    .select("id,question,allow_multiple,ends_at,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <Topbar title="Votings" subtitle="Aktive Votings + Live-Ergebnisse." />
      <main className="px-4 py-6 lg:px-6">
        {isAdmin ? (
          <Card className="mb-4 max-w-2xl">
            <CardHeader>
              <CardTitle>Voting erstellen (Admin)</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createVoting} className="grid gap-4">
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Frage</span>
                  <input
                    name="question"
                    required
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                    placeholder="z. B. Welche Aktion sollen wir nächste Woche pushen?"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-sm font-medium text-slate-700">Ende</span>
                  <input
                    type="datetime-local"
                    name="ends_at"
                    required
                    className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="allow_multiple" className="h-4 w-4 rounded border" />
                  Mehrfachauswahl erlauben
                </label>

                <div className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Antwortoptionen (2–10)</span>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <input
                      key={i}
                      name="options"
                      required={i < 2}
                      className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                      placeholder={`Option ${i + 1}`}
                    />
                  ))}
                </div>

                <button className="h-11 rounded-xl bg-fc-navy text-sm font-semibold text-white shadow-sm shadow-slate-900/10 hover:bg-fc-blue">
                  Voting veröffentlichen
                </button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-4 text-sm text-slate-600">
            Du siehst hier nur aktive Votings und Ergebnisse.{" "}
            <Link href="/polls" className="font-medium text-fc-blue hover:underline">
              Zu den Umfragen →
            </Link>
          </div>
        )}

        <Suspense fallback={<div className="text-sm text-slate-600">Lade Votings…</div>}>
          <VotingBoard initialVotings={initialVotings ?? []} />
        </Suspense>
      </main>
    </div>
  );
}
