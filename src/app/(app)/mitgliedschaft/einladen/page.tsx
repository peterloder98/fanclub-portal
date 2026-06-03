import { Topbar } from "@/components/app-shell/topbar";
import { ReferMembershipClient } from "@/components/membership/refer-membership.client";

export default function MitgliedschaftEinladenPage() {
  return (
    <div className="min-h-screen">
      <Topbar
        title="Neues Mitglied werben"
        subtitle="Digitalen Antragslink per E-Mail versenden — für Freunde und Bekannte."
      />
      <main className="px-4 py-6 lg:px-6">
        <ReferMembershipClient />
      </main>
    </div>
  );
}
