import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ANNI_SPOTIFY_OPEN_URL } from "@/lib/spotify/constants";

export default async function AdminSpotifySettingsPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <Topbar
        title="Spotify (Admin)"
        subtitle="Wie Spotify im Portal für Mitglieder läuft"
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <div className="mt-4 grid max-w-2xl gap-4">
          <Card className="border-fc-sky/30 bg-fc-ice/40">
            <CardHeader>
              <CardTitle className="text-base text-fc-navy">Aktueller Stand</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-fc-navy">
              <p>
                In der Sidebar läuft das <strong>offizielle Spotify-Embed</strong> plus ein Button{" "}
                <strong>In Spotify öffnen</strong>. Dafür braucht jedes Mitglied{" "}
                <strong>kein</strong> Developer-Login und keine Test-E-Mail bei Spotify.
              </p>
              <p>
                Artist-Link:{" "}
                <a
                  href={ANNI_SPOTIFY_OPEN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline break-all"
                >
                  {ANNI_SPOTIFY_OPEN_URL}
                </a>
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-base text-amber-950">
                Warum kein „Mit Spotify verbinden“ mehr?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-amber-950">
              <p>
                Spotifys Web Playback / API ist für kleine Apps praktisch tot: Development nur mit
                wenigen Test-Usern, Extended Quota oft erst ab riesigen Nutzerzahlen (z.&nbsp;B.
                Hunderttausende). Für den Fanclub ist das nicht machbar.
              </p>
              <p>
                Deshalb: Embed + Link in die Spotify-App. Premium-Nutzer, die im Browser bei Spotify
                eingeloggt sind, können im Embed oft volle Songs hören; alle anderen öffnen Spotify
                normal.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alte Developer-App</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>
                <code className="text-xs">SPOTIFY_CLIENT_ID</code> /{" "}
                <code className="text-xs">SPOTIFY_CLIENT_SECRET</code> in Vercel werden für den
                Sidebar-Player aktuell <strong>nicht</strong> mehr gebraucht. Die können drin bleiben
                (schadet nicht) oder später entfernt werden.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
