import { Topbar } from "@/components/app-shell/topbar";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSpotifySettingsPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <Topbar
        title="Spotify (Admin)"
        subtitle="Web-Player mit Login — für alle Mitglieder braucht ihr Extended Quota"
      />
      <main className="px-4 py-6 lg:px-8">
        <Link href="/admin" className="mb-4 inline-block text-sm font-medium text-blue-600 hover:underline">
          ← Admin
        </Link>

        <div className="grid max-w-2xl gap-4">
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
                Pflicht für alle Mitglieder: Extended Quota
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-amber-950">
              <p>
                Im <strong>Development-Modus</strong> dürfen nur manuell eingetragene E-Mails (max. 25)
                den Player nutzen. Das reicht für einen Fanclub nicht.
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  <a
                    href="https://developer.spotify.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-700 underline"
                  >
                    Spotify Developer Dashboard
                  </a>{" "}
                  → eure App
                </li>
                <li>
                  <strong>Quota Extension Request</strong> / Extended Quota Mode beantragen
                </li>
                <li>
                  Use Case: Fanclub-Portal, Mitglieder verbinden eigenes Spotify für Musik im Browser
                </li>
              </ol>
              <p className="text-xs">
                Bis zur Freigabe: zum Testen einzelne E-Mails unter User Management eintragen.
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
