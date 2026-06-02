import { Suspense } from "react";
import { Topbar } from "@/components/app-shell/topbar";
import { PollBoard } from "@/components/polls/poll-board";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminPollForm } from "../admin/polls/admin-poll-form";

export default async function PollsPage() {
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

  const { data: initialPolls } = await supabase
    .from("polls")
    .select("id,question,allow_multiple,ends_at,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <Topbar
        title="Umfragen"
        subtitle="Abstimmen, Live-Ergebnisse und Kommentare."
      />
      <main className="px-4 py-6 lg:px-6">
        {isAdmin ? (
          <div className="mb-4">
            <AdminPollForm />
          </div>
        ) : null}
        <Suspense fallback={<div className="text-sm text-slate-600">Lade Umfragen…</div>}>
          <PollBoard initialPolls={initialPolls ?? []} />
        </Suspense>
      </main>
    </div>
  );
}
