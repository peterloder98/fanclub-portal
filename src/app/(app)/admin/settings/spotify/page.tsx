import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSpotifySettingsPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <Topbar
        title="Spotify (Admin)"
        subtitle="Anleitung im Fanclub-Portal — nicht im Spotify-Dashboard"
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <div className="mt-4 grid max-w-2xl gap-4">
          <Card className="border-fc-sky/30 bg-fc-ice/40">
            <CardHeader>
              <CardTitle className="text-base text-fc-navy">Zwei verschiedene Orte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-fc-navy">
              <p>
                <strong>„Admin → Spotify“</strong> ist diese Seite hier im Fanclub-Portal (
                <code className="text-xs">/admin/settings/spotify</code>
                ). Im Spotify Developer Dashboard gibt es diesen Menüpunkt{" "}
                <strong>nicht</strong>.
              </p>
              <p>
                Bei Spotify:{" "}
                <a
                  href="https://developer.spotify.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  developer.spotify.com/dashboard
                </a>{" "}
                → eure App anklicken → dort u. a. <strong>Settings</strong> (Redirect-URI) und{" "}
                <strong>User Management</strong> (Test-E-Mails im Development-Modus).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">So funktioniert es in der App</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>
                Mitglieder klicken <strong>Mit Spotify verbinden</strong> und loggen sich mit ihrem
                eigenen Spotify ein (Premium/Familie). Danach startet der <strong>Web-Player</strong>{" "}
                automatisch — volle Songs, kein 30-Sek.-Embed.
              </p>
              <p>
                Jeder nutzt <strong>seinen</strong> Account — nicht euer Admin-Spotify.
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-base text-amber-950">
                Mehr als Testnutzer: Extended Quota (bei Spotify)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-amber-950">
              <p>
                Im <strong>Development-Modus</strong> funktioniert der Web-Player nur für E-Mails, die
                ihr unter <strong>User Management</strong> eintragt (begrenzte Anzahl — siehe Spotify-Doku).
              </p>
              <p>
                <strong>Extended Quota</strong> hebt diese Begrenzung auf. Wo der Antrag erscheint,
                hängt von eurem Spotify-Konto ab:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Oft: App öffnen → <strong>Settings</strong> → Tab{" "}
                  <strong>Quota extension Request</strong> (kann fehlen)
                </li>
                <li>
                  Seit Mai 2025 oft nur für <strong>Organisationen</strong> mit großem Live-Produkt;
                  Details:{" "}
                  <a
                    href="https://developer.spotify.com/documentation/web-api/concepts/quota-modes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-fc-blue underline"
                  >
                    Quota modes (Spotify)
                  </a>
                </li>
              </ul>
              <p className="text-xs">
                Bis zur Freigabe: Test-E-Mails unter User Management eintragen. Fehlt der Tab komplett,
                ist das bei privaten/kleinen Apps aktuell normal — nicht etwas im Fanclub-Admin.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vercel / Technik</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700">
              <p>
                <code className="text-xs">SPOTIFY_CLIENT_ID</code>,{" "}
                <code className="text-xs">SPOTIFY_CLIENT_SECRET</code>,{" "}
                <code className="text-xs">APP_BASE_URL</code>,{" "}
                <code className="text-xs">SMTP_SECRET</code> (für Token-Verschlüsselung).
              </p>
              <p className="mt-2">
                Supabase: <code className="text-xs">026_spotify_connections.sql</code>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
