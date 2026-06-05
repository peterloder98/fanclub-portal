import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { ClubAccountingPanel } from "@/components/admin/club-accounting-panel.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listClubLedger } from "@/lib/club/ledger";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminAccountingPage() {
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

  let entries: Awaited<ReturnType<typeof listClubLedger>> = [];
  let ledgerAvailable = true;

  try {
    entries = await listClubLedger({ limit: 500 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/club_ledger_entries|does not exist/i.test(msg)) {
      ledgerAvailable = false;
    } else {
      throw e;
    }
  }

  return (
    <div className="min-h-screen">
      <Topbar
        title="Mini-Buchhaltung"
        subtitle="Einnahmen und Ausgaben — allgemein oder pro Mitglied im Datensatz."
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <div className="mt-4">
          <ClubAccountingPanel entries={entries} ledgerAvailable={ledgerAvailable} />
        </div>
      </main>
    </div>
  );
}
