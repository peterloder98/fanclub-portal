# Spotify Web-Player (Login pro Mitglied)

## In der App

1. Sidebar → **Mit Spotify verbinden** (Popup)
2. Mit **eigenem** Spotify-Konto anmelden (Premium oder Familien-Profil mit Premium-Slot)
3. Player verbindet automatisch → **▶ Anni Perka abspielen**

Kein Embed, keine 30-Sek.-Vorschau.

## Für alle Mitglieder (wichtig)

Die Spotify-App muss aus dem **Development-Modus** in den **Extended Quota Mode** (Quota Extension bei Spotify beantragen).

Sonst funktioniert der Login nur für bis zu 25 manuell eingetragene E-Mails im Developer-Dashboard.

Details: **Admin → Spotify (Embed für alle Mitglieder)** — Seite erklärt den Antrag.

## Env (Vercel)

| Variable | Zweck |
|----------|--------|
| `SPOTIFY_CLIENT_ID` | Developer App |
| `SPOTIFY_CLIENT_SECRET` | Developer App |
| `APP_BASE_URL` | z. B. `https://fanclub-portal-ap.vercel.app` |
| `SMTP_SECRET` | Refresh-Token verschlüsseln (gleicher Wert wie beim Verbinden) |

Redirect URI im Dashboard: `{APP_BASE_URL}/api/spotify/callback`

## Supabase

`supabase/026_spotify_connections.sql`
