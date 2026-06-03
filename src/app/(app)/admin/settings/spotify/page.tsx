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
        subtitle="Für alle Mitglieder: Embed in der Sidebar — ohne E-Mail-Liste im Developer-Dashboard"
      />
      <main className="px-4 py-6 lg:px-8">
        <Link href="/admin" className="mb-4 inline-block text-sm font-medium text-blue-600 hover:underline">
          ← Admin
        </Link>

        <div className="grid max-w-2xl gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aktuelle Lösung (empfohlen)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>
                In der Sidebar läuft der <strong>offizielle Spotify-Embed</strong>. Jede/r Fanclub-Mitglied
                kann ihn nutzen — <strong>ohne</strong> dass du E-Mails im Spotify Developer Dashboard
                eintragen musst.
              </p>
              <p>
                <strong>Premium / Familien-Abo:</strong> Nutzer:in im selben Browser bei Spotify einloggen
                → volle Länge im Embed. Free-Konten: nur Vorschau (~30 Sek.) — das legt Spotify fest.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Optional später: In-App-Player für alle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>
                Der alte „Mit Spotify verbinden“-Player (Web Playback SDK) braucht im Development-Modus
                eine manuelle User-Liste (max. 25) — für einen Fanclub ungeeignet.
              </p>
              <p>
                Für Wiedergabe <strong>für beliebig viele Nutzer</strong> muss die Spotify-App aus dem
                Development-Modus:
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  <a
                    href="https://developer.spotify.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Spotify Developer Dashboard
                  </a>{" "}
                  → deine App → <strong>Settings</strong>
                </li>
                <li>
                  <strong>Quota Extension Request</strong> / „Extended Quota Mode“ beantragen (Use Case:
                  Fanclub-Portal, eingebettete Musik für Mitglieder)
                </li>
                <li>Nach Freigabe durch Spotify könnte der In-App-Player wieder aktiviert werden</li>
              </ol>
              <p className="text-xs text-slate-500">
                Bis dahin: Embed-Player reicht für fast alle Fälle.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Technik (Vercel)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700">
              <p>
                <code className="text-xs">SPOTIFY_CLIENT_ID</code> und{" "}
                <code className="text-xs">SPOTIFY_CLIENT_SECRET</code> werden für den Embed nicht
                benötigt — nur falls ihr später wieder OAuth/Web-Player nutzt.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
