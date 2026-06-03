# Spotify (pro Nutzer) – Einrichtung & Login-Probleme

## Developer Dashboard – Anmeldung klappt nicht?

1. **URL:** https://developer.spotify.com/dashboard (nicht die normale Spotify-Web-App).
2. **Mit Spotify-Konto anmelden** – dieselbe E-Mail wie in der Spotify-App (Premium nicht nötig fürs Dashboard).
3. **„Log in“** mit E-Mail + Passwort (nicht nur Facebook; Social-Login ist oft instabil).
4. **Developer Terms** beim ersten Besuch akzeptieren („Agree“ / „Accept“).
5. **Zwei-Faktor:** Code aus Authenticator-App oder SMS eingeben.
6. **Inkognito-Fenster** oder anderen Browser testen; Werbeblocker/Cookie-Blocker für `spotify.com` deaktivieren.
7. **Passwort zurücksetzen:** https://www.spotify.com/password-reset – danach erneut im Dashboard einloggen.
8. **Firmen-/Kinderkonto:** Manche Kontotypen haben keinen Developer-Zugang – privates Erwachsenen-Konto verwenden.

Wenn die Seite nur lädt oder „Something went wrong“ zeigt: VPN aus, 10 Minuten warten, erneut versuchen.

## App anlegen (nach Login)

1. **Create app** → Name z. B. `Anni Perka Fanclub Portal`.
2. **Redirect URIs** (exakt, ohne Slash am Ende):
   - Lokal: `http://localhost:3000/api/spotify/callback`
   - Produktion: `https://DEINE-DOMAIN.vercel.app/api/spotify/callback`
3. **Settings** → Client ID und Client Secret kopieren.

## Umgebungsvariablen (Vercel + `.env.local`)

| Variable | Wert |
|----------|------|
| `SPOTIFY_CLIENT_ID` | aus dem Dashboard |
| `SPOTIFY_CLIENT_SECRET` | aus dem Dashboard |
| `APP_BASE_URL` | z. B. `https://fanclub-portal-ap.vercel.app` |
| `SPOTIFY_TOKEN_SECRET` | mind. 16 Zeichen (oder bestehendes `SMTP_SECRET`) |

## Supabase

`supabase/026_spotify_connections.sql` im SQL Editor ausführen.

## In der App

Sidebar → **Mit Spotify verbinden** → Spotify-Login (Nutzer-Konto, nicht Developer).  
**Spotify Premium** nötig für Wiedergabe im Browser über den eingebauten Player.
