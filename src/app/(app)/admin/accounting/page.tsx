import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminMembersNav } from "@/components/admin/admin-members-nav";
import { ClubAccountingPanel } from "@/components/admin/club-accounting-panel.client";
import { listClubLedger } from "@/lib/club/ledger";
import { listOpenContributions } from "@/lib/club/membership-contribution";
import { listOpenMeetingCharges } from "@/lib/club/meeting-charges";
import { getAccountingSettings } from "@/lib/club/accounting-settings";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminAccountingPage() {
  await requireAdmin();

  let entries: Awaited<ReturnType<typeof listClubLedger>> = [];
  let openContributions: Awaited<ReturnType<typeof listOpenContributions>> = [];
  let openMeetingCharges: Awaited<ReturnType<typeof listOpenMeetingCharges>> = [];
  let ledgerAvailable = true;
  let accountingSettings = { startDate: null as string | null, openingBalanceCents: 0 };

  try {
    [entries, openContributions, openMeetingCharges, accountingSettings] = await Promise.all([
      listClubLedger({ limit: 5000 }),
      listOpenContributions(),
      listOpenMeetingCharges(),
      getAccountingSettings(),
    ]);
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
        title="Buchhaltung"
        subtitle="Einnahmen und Ausgaben — allgemein oder pro Mitglied im Datensatz."
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <div className="mt-4">
          <AdminMembersNav active="accounting" />
        </div>
        <div className="mt-4">
          <ClubAccountingPanel
            entries={entries}
            openContributions={openContributions}
            openMeetingCharges={openMeetingCharges}
            ledgerAvailable={ledgerAvailable}
            accountingSettings={accountingSettings}
          />
        </div>
      </main>
    </div>
  );
}
