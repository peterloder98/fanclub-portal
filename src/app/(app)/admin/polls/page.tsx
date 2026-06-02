import { Topbar } from "@/components/app-shell/topbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminPollForm } from "./admin-poll-form";

export default async function AdminPollsPage() {
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

  return (
    <div className="min-h-screen">
      <Topbar title="Umfrage erstellen" subtitle="Admin: Frage, Optionen, Enddatum." />
      <main className="px-4 py-6 lg:px-8">
        <AdminPollForm />
      </main>
    </div>
  );
}
