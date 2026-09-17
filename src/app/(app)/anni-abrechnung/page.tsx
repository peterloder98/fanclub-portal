import { Topbar } from "@/components/app-shell/topbar";
import { AnniAbrechnungWorkspace } from "@/components/anni-management/anni-abrechnung-workspace.client";
import { requireAnniManagementFinance } from "@/lib/anni-management/require";
import { loadAnniMgmtFinanceBundle } from "@/lib/anni-management/queries";
import { ANNI_MGMT_FINANCE_TITLE } from "@/lib/anni-management/access";
import { berlinTodayIsoDate } from "@/lib/anni-management/calc";

export const dynamic = "force-dynamic";

export default async function AnniAbrechnungPage() {
  const gate = await requireAnniManagementFinance();
  const bundle = await loadAnniMgmtFinanceBundle();
  const todayIso = berlinTodayIsoDate();
  const [y, m] = todayIso.split("-").map(Number);

  return (
    <div className="min-h-screen">
      <Topbar
        title={ANNI_MGMT_FINANCE_TITLE}
        subtitle="Vertraulich — nur Anni und Management. Alle Beträge netto."
      />
      <main className="px-4 py-6 lg:px-8">
        <AnniAbrechnungWorkspace
          jobs={bundle.jobs}
          payouts={bundle.payouts}
          settlements={bundle.settlements}
          incomeTypes={bundle.incomeTypes}
          people={bundle.people}
          schemaReady={bundle.schemaReady}
          schemaError={bundle.schemaError}
          canInvite={gate.canInvite}
          todayIso={todayIso}
          initialYear={y}
          initialMonth={m}
        />
      </main>
    </div>
  );
}
