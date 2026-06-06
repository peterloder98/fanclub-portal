import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { Gift } from "lucide-react";

export default function AdminAdventCalendarPage() {
  return (
    <div className="min-h-screen">
      <Topbar
        title="Adventskalender"
        subtitle="Vorbereitung — 24 Türchen für die Weihnachtszeit."
      />
      <main className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
        <AdminBackLink href="/admin" />
        <div className="mt-4 rounded-2xl border border-fc-sky/25 bg-gradient-to-br from-fc-ice via-white to-fc-mist p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fc-navy to-fc-blue text-white">
              <Gift className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-fc-navy">Adventskalender-Funktion in Vorbereitung</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Die Datenbankstruktur (<code className="text-xs">advent_calendar_days</code>,{" "}
                <code className="text-xs">advent_calendar_entries</code>) ist angelegt. Geplant sind 24
                Türchen mit Text, Bild, Video, Gewinnspiel, Quiz oder Rabatt — Sichtbarkeit nach Datum,
                optional nur für aktive Mitglieder.
              </p>
              <p className="mt-3 text-sm text-slate-500">
                Nächster Schritt: Admin-Editor für Türchen und Mitglieder-Ansicht ab Dezember.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
