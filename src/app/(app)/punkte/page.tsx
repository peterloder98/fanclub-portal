import { Topbar } from "@/components/app-shell/topbar";
import { PunktePageClient } from "@/components/points/punkte-page.client";

export default function PunktePage() {
  return (
    <div className="min-h-screen">
      <Topbar
        title="Statuspunkte"
        subtitle="Deine Punkte, Rang, Historie — und wie das System funktioniert."
      />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
        <PunktePageClient />
      </main>
    </div>
  );
}
