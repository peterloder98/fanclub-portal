import { Topbar } from "@/components/app-shell/topbar";
import { PointsGuideCard } from "@/components/points/points-guide-card";

export default function PunktePage() {
  return (
    <div className="min-h-screen">
      <Topbar
        title="Statuspunkte"
        subtitle="Wofür du Punkte bekommst, wie viele — und welche Ränge es gibt."
      />
      <main className="px-4 py-6 lg:px-6">
        <PointsGuideCard />
      </main>
    </div>
  );
}
