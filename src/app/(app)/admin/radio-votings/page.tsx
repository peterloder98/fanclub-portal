import Link from "next/link";
import { Topbar } from "@/components/app-shell/topbar";
import { RadioVotingsAdmin } from "@/components/admin/radio-votings-admin.client";
import { loadAllRadioCampaignsAdmin } from "@/lib/votings/load-radio-campaigns";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function AdminRadioVotingsPage() {
  await requireAdmin();

  let campaigns: Awaited<ReturnType<typeof loadAllRadioCampaignsAdmin>> = [];
  let tableMissing = false;

  try {
    const admin = createSupabaseAdminClient();
    campaigns = await loadAllRadioCampaignsAdmin(admin);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/radio_voting_campaigns|does not exist/i.test(msg)) {
      tableMissing = true;
    } else {
      throw e;
    }
  }

  return (
    <div className="min-h-screen">
      <Topbar
        title="Radio-Votings"
        subtitle="Hörer-Charts pflegen, Runden zurücksetzen, Enddaten."
      />
      <main className="mx-auto max-w-4xl px-4 py-6 lg:px-6">
        <p className="mb-4 text-sm text-slate-600">
          <Link href="/admin" className="font-medium text-fc-blue hover:underline">
            ← Admin
          </Link>
          {" · "}
          <Link href="/votings" className="font-medium text-fc-blue hover:underline">
            Mitglieder-Ansicht
          </Link>
        </p>

        {tableMissing ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Tabelle fehlt — bitte{" "}
            <code className="rounded bg-white px-1">supabase/083_radio_voting_campaigns.sql</code>{" "}
            in Supabase ausführen.
          </div>
        ) : (
          <RadioVotingsAdmin campaigns={campaigns} />
        )}
      </main>
    </div>
  );
}
