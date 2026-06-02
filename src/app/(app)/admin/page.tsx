import { Topbar } from "@/components/app-shell/topbar";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  return (
    <div className="min-h-screen">
      <Topbar title="Admin" subtitle="System, Einstellungen, Moderation." />
      <main className="px-4 py-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Moderation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-slate-700">
              <Link
                href="/admin/members"
                className="rounded-xl border bg-white px-4 py-3 shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
              >
                Mitglieder & Anträge
              </Link>
              <Link
                href="/admin/settings/email"
                className="rounded-xl border bg-white px-4 py-3 shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
              >
                E-Mail / SMTP
              </Link>
              <Link
                href="/admin/settings/email-templates"
                className="rounded-xl border bg-white px-4 py-3 shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
              >
                E-Mail-Vorlagen
              </Link>
              <Link
                href="/admin/signatures"
                className="rounded-xl border bg-white px-4 py-3 shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
              >
                Admin-Signaturen
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Events</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-slate-700">
              <Link
                href="/admin/events-sync"
                className="rounded-xl border bg-white px-4 py-3 shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
              >
                Artistflow Sync & Logs
              </Link>
              <div className="text-sm text-slate-600">
                Hier verwaltest du Synchronisation, Geocoding und Sync-Status.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

