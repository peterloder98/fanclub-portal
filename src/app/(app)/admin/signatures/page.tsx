import { Topbar } from "@/components/app-shell/topbar";
import { AdminSignatureSettings } from "@/components/admin/admin-signature-settings";
import { ClubSignatureSettings } from "@/components/admin/club-signature-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminSignaturesPage() {
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
      <Topbar
        title="Admin · Signaturen"
        subtitle="Fanclub-Signatur und deine persönliche Unterschrift für E-Mails."
      />
      <main className="px-4 py-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2 lg:items-start">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Fanclub (allgemein)</h2>
            <div className="mt-4">
              <ClubSignatureSettings />
            </div>
          </section>
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Deine Unterschrift</h2>
            <div className="mt-4">
              <AdminSignatureSettings />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
