import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GiveawaysPage() {
  return (
    <div className="min-h-screen">
      <Topbar
        title="Verlosungen"
        subtitle="Teilnahmen & Auslosungen – später protokolliert nachvollziehbar."
      />
      <main className="px-4 py-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Platzhalter</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Später: Teilnahmefrist, Bedingungen, Gewinner-Auslosung im Admin,
            Benachrichtigung per In-App & E-Mail.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

