import { Topbar } from "@/components/app-shell/topbar";
import { Badge } from "@/components/ui/badge";
import { ClubAccountingPanel } from "@/components/admin/club-accounting-panel.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listClubLedger, sumClubLedger } from "@/lib/club/ledger";
import { redirect } from "next/navigation";
import Link from "next/link";

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
  let totals = { incomeCents: 0, expenseCents: 0 };
  let ledgerAvailable = true;

  try {
    [entries, totals] = await Promise.all([listClubLedger({ limit: 200 }), sumClubLedger()]);
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
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="brand">Admin</Badge>
          <Link
            href="/admin/members"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Mitgliederliste
          </Link>
        </div>

        <ClubAccountingPanel
          entries={entries}
          incomeCents={totals.incomeCents}
          expenseCents={totals.expenseCents}
          ledgerAvailable={ledgerAvailable}
        />
      </main>
    </div>
  );
}
