# Demo-Zugang & Vercel-Deploy (Fanclub-Portal)

Die App nutzt **dieselbe Supabase-Datenbank** lokal und online. Vercel hostet nur das Next.js-Frontend/API — keine zweite Datenbank nötig.

---

## Phase 1: Voraussetzungen (einmalig)

### 1.1 Supabase produktionsbereit

Im [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor: alle Migrationen aus `supabase/` in Reihenfolge ausführen (`001` … `021`), falls noch nicht geschehen.

**Storage-Buckets** (Storage → Buckets), falls fehlend:

- `membership-signatures` (öffentlich oder Policy wie in `018`)
- `signatures` (Admin-Unterschriften)
- `avatars`, `post-media` (falls Posts mit Bildern genutzt werden)

### 1.2 Code auf GitHub

Im Projektordner `fanclub-portal` (oder Repo-Root mit Unterordner):

```bash
git init   # falls noch kein Repo
git add .
git commit -m "Initial fanclub portal"
```

Auf GitHub: **New repository** (privat empfohlen) → dann:

```bash
git remote add origin https://github.com/DEIN-ORG/fanclub-portal.git
git branch -M main
git push -u origin main
```

> Liegt der Code im Ordner `Fanclub App/fanclub-portal` im Repo, merken: später in Vercel **Root Directory** = `fanclub-portal`.

### 1.3 Geheimnisse sammeln

Aus lokaler `.env.local` (nicht committen) und Supabase → **Settings → API**:

| Variable | Quelle |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (geheim!) |
| `SMTP_SECRET` | mind. 16 Zeichen, selbst generieren |
| `APP_BASE_URL` | erst nach Deploy: `https://….vercel.app` |
| `SMTP_SEED_*` | optional, einmaliges SMTP in DB |
| `ARTISTFLOW_FEED_URL` | falls Events-Sync genutzt |
| `CRON_SECRET` | optional, für geschützten Cron |
| `MEMBERSHIP_DOWNLOAD_SECRET` | optional |

---

## Phase 2: Vercel-Projekt anlegen

1. [vercel.com](https://vercel.com) → Login (GitHub-Konto verknüpfen).
2. **Add New… → Project**.
3. **Import** des GitHub-Repos.
4. **Configure Project:**
   - **Framework Preset:** Next.js (automatisch).
   - **Root Directory:** `fanclub-portal` klicken und bestätigen, wenn der Code in einem Unterordner liegt.
   - **Build Command:** `npm run build` (Standard).
   - **Output:** Next.js Default.
5. **Environment Variables** — für **Production** (und optional Preview dieselben Werte):

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   APP_BASE_URL=https://PLATZHALTER.vercel.app   # nach erstem Deploy anpassen
   SMTP_SECRET=...
   SMTP_SEED_SERVER=...        # optional
   SMTP_SEED_PORT=465
   SMTP_SEED_ENCRYPTION=SSL
   SMTP_SEED_EMAIL=...
   SMTP_SEED_PASSWORD=...
   SMTP_SEED_DISPLAY_NAME=Anni Perka Fanclub
   SMTP_SEED_IS_DEFAULT=true
   ARTISTFLOW_FEED_URL=...     # falls Events
   CRON_SECRET=...             # empfohlen auf Production
   ```

6. **Deploy** — Build dauert ca. 2–5 Minuten.

### Nach dem ersten Deploy

1. Vercel zeigt die URL, z. B. `https://fanclub-portal-abc123.vercel.app`.
2. **Settings → Environment Variables** → `APP_BASE_URL` auf diese exakte URL setzen (ohne trailing slash).
3. **Redeploy:** Deployments → … beim letzten Deploy → **Redeploy** (damit E-Mail-Links stimmen).

---

## Phase 3: Supabase Auth für die Live-URL

Supabase → **Authentication → URL Configuration**:

| Feld | Wert |
|------|------|
| **Site URL** | `https://dein-projekt.vercel.app` |
| **Redirect URLs** | `https://dein-projekt.vercel.app/**` |
| | `https://dein-projekt.vercel.app/auth/callback` |

Ohne diese Einträge schlagen Login, Passwort-Reset und Magic Links fehl.

Optional: **Custom Domain** in Vercel (z. B. `portal.fanclub.de`) → dieselben URLs in Supabase mit der neuen Domain ergänzen und `APP_BASE_URL` anpassen.

---

## Phase 4: Was ihr dem Vorstand schickt

**Öffentlich (ohne Login):**

- Mitgliedschaftsantrag: `https://…vercel.app/mitgliedschaft`
- Satzung: `https://…vercel.app/documents/satzung.pdf`

**Intern (mit Login):**

| Rolle | Start-URL | Hinweis |
|-------|-----------|---------|
| Admin | `/login` → `/admin` oder `/admin/members` | `profiles.role = admin` |
| Mitglied | `/dashboard` | nach Freigabe |
| Bewerber (status applied) | `/mitgliedschaft/ausstehend` | nach Antrag + Konto |

**Demo-Zugang anlegen (empfohlen):**

1. Supabase → **Authentication → Users → Add user** (E-Mail + Passwort).
2. SQL Editor oder Table Editor → `profiles` → für diese `user_id` → `role = admin`.
3. Zugangsdaten **sicher** (nicht in WhatsApp-Gruppe mit Klartext-Passwort) übergeben — z. B. Passwortmanager-Link oder einmaliges Meeting.

Alternativ: bestehenden lokalen Admin-User nutzen (gleiche DB).

---

## Phase 5: Wie es danach weitergeht (Betrieb)

### Automatische Deploys

- **Push auf `main`** → Vercel baut und veröffentlicht **Production**.
- **Pull Request / anderer Branch** → eigene **Preview-URL** (gut für „schaut euch Version X an“).

### SMTP & E-Mails auf Production

1. Nach erstem Antrag oder Besuch von `/admin/settings/email` kann `SMTP_SEED_*` das Konto in die DB schreiben.
2. Danach SMTP nur noch in der Admin-Oberfläche pflegen (Passwort verschlüsselt mit `SMTP_SECRET`).
3. Vorlagen: `/admin/settings/email-templates`.

### Cron (Artistflow Events)

`vercel.json` startet alle 6 Stunden `/api/cron/artistflow-sync`. Auf dem **Hobby-Plan** sind Cron-Jobs eingeschränkt; **Pro** oder manueller Aufruf über `/admin/events-sync` als Fallback.

`CRON_SECRET` in Vercel setzen — der Endpoint prüft den Header `Authorization: Bearer <CRON_SECRET>`.

### Typischer Demo-→Live-Ablauf

1. **Demo auf Vercel** — Vorstand testet Antrag, Admin-Freigabe, Posts, Umfragen.
2. Feedback einarbeiten → `git push` → automatisch neu deployed.
3. **Eigene Domain** in Vercel verbinden → Supabase Redirects + `APP_BASE_URL` aktualisieren.
4. Optional: separates Supabase-Projekt nur für Production (sauberer, mehr Aufwand).

---

## Option B: Schnelltest ohne Deploy (ngrok)

```bash
cd fanclub-portal
npm run dev
# zweites Terminal:
npx ngrok http 3000
```

Die `https://….ngrok-free.app`-URL weitergeben. PC muss laufen; URL wechselt oft.

---

## Checkliste nach Deploy

- [ ] Build auf Vercel grün
- [ ] `APP_BASE_URL` = Production-URL, Redeploy
- [ ] Supabase Site URL + Redirect URLs
- [ ] Login als Admin funktioniert
- [ ] `/mitgliedschaft` — Testantrag (optional löschen)
- [ ] `/admin/settings/email` — SMTP testen
- [ ] PDF-Vorschau unter `/admin/members/applications/[id]`
- [ ] Keine Secrets im Repo / in Screenshots

## Sicherheit

- `SUPABASE_SERVICE_ROLE_KEY` nur in Vercel Env, nie im Browser.
- Demo-Passwörter rotieren oder User nach Demo löschen.
- SMTP-Passwort bei Leak im Postfach-Anbieter wechseln.
