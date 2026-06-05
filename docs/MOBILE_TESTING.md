# Mobile-Test-Checkliste (Fanclub Portal)

## Geräte & Viewports (Browser DevTools)

| Gerät | Auflösung | Warum |
|-------|-----------|-------|
| iPhone SE | 375×667 | Kleinstes gängiges iPhone |
| iPhone 14 | 390×844 | Standard-Mobile |
| Pixel 7 | 412×915 | Android-Referenz |

**Chrome:** F12 → Device Toolbar (Cmd+Shift+M) → Gerät wählen → Hard Reload.

## Pro Screen (5 Minuten)

1. **Navigation** — Burger öffnen/schließen, alle Links erreichbar, aktiver Zustand sichtbar
2. **Scroll** — Kein horizontaler Overflow, Sticky-Header stört nicht
3. **Forms** — Inputs volle Breite, min. 44px Höhe, Keyboard überdeckt nicht den Submit-Button
4. **CTAs** — Primärbutton gut erreichbar (Daumenzone unten bei Shop-Checkout)
5. **Bilder** — Kein Layout-Springen beim Laden

## Prioritäts-Screens

- `/dashboard`
- `/events`
- `/merchandise` (Shop-Flow: Katalog → Detail → Warenkorb → Checkout)
- `/giveaways/[id]` (Kommentare + Avatar)
- `/posts`
- `/admin/merchandise` (Produktliste + Detail)
- `/admin/merchandise/orders` (Cards auf Mobile)

## Realdevice (empfohlen, 10 Min.)

1. URL auf dem Handy öffnen: `https://fanclub-portal-ap.vercel.app`
2. Einloggen als Mitglied → Merchandise bestellen (Test)
3. Als Admin → Bestellung öffnen, Status ändern
4. Prüfen: Tap-Ziele, Lesbarkeit, keine Zoom-Pflicht bei Eingaben

## Definition of Done (Mobile)

- [ ] Kein `overflow-x` auf 375px Breite
- [ ] Touch-Ziele ≥ 44px
- [ ] Tabellen nur ab `md`; auf Mobile Cards
- [ ] Viewport-Meta gesetzt (`layout.tsx`)
- [ ] Sticky-Leisten (Shop) berücksichtigen `padding-bottom` am Seitenende
