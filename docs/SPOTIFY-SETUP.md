# Spotify im Fanclub-Portal

## Lösung für alle Mitglieder (ohne E-Mail-Liste)

Die Sidebar nutzt den **offiziellen Spotify-Embed** (`open.spotify.com/embed`).  
Das funktioniert für **jedes Mitglied**, ohne Eintrag im Spotify Developer Dashboard.

| Konto | Was passiert im Embed |
|--------|------------------------|
| **Premium / Familie (Premium-Slot)** | Volle Songs, wenn im **selben Browser** bei [spotify.com](https://open.spotify.com) eingeloggt |
| **Free** | Oft nur ~30 Sek. Vorschau (Spotify-Regel, nicht änderbar) |

**Tipp Familien-Abo:** Mit dem Familien-Profil bei Spotify im Browser anmelden, dann Fanclub-App neu laden und im Embed abspielen.

OAuth „Mit Spotify verbinden“ ist in der Sidebar **deaktiviert**, weil im Development-Modus nur 25 E-Mails erlaubt sind.

## Optional später: In-App-Player für beliebig viele Nutzer

Nur nötig, wenn ihr Wiedergabe **ohne** Embed im Portal steuern wollt (Web Playback SDK):

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → eure App
2. **Quota Extension Request** / Extended Quota Mode beantragen
3. Nach Freigabe durch Spotify kann der OAuth-Player wieder eingebaut werden

Details: Admin → **Spotify (Embed für alle Mitglieder)**

## Env-Variablen (nur für künftigen OAuth-Player)

| Variable | Zweck |
|----------|--------|
| `SPOTIFY_CLIENT_ID` | Developer App |
| `SPOTIFY_CLIENT_SECRET` | Developer App |
| `APP_BASE_URL` | Redirect-URI-Basis |
| `SMTP_SECRET` | Verschlüsselung Refresh-Tokens (falls OAuth aktiv) |

Für den **Embed allein** sind diese Variablen **nicht** erforderlich.

## Developer Dashboard – Redirect URIs (falls OAuth wieder aktiv)

- `https://DEINE-DOMAIN.vercel.app/api/spotify/callback`
- `http://localhost:3000/api/spotify/callback` (lokal)

## Supabase

`supabase/026_spotify_connections.sql` — nur relevant, wenn OAuth/Web-Player wieder genutzt wird.
