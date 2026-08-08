# REPORT-PWA.md — PWA, Offline, iPhone

Untersucht: openGym, Liftosaur, nutritrace, Wingfit, Waistline.

## 1. Service Worker — Entscheidung

**Strategie von openGym** (60 Zeilen, vollständig verstanden):
- statische Assets: cache-first (bei Vite: precache der gehashten Dateien)
- Navigation/HTML: network-first mit `index.html`-Fallback
- API-Aufrufe (später OFF): nie cachen
- `skipWaiting` + `clients.claim` nur kontrolliert (siehe Updates)

**Umsetzung über `vite-plugin-pwa`** (vom Nutzer bestätigt): Precache automatisch aus dem
Build-Manifest, Verhalten wie oben konfigurieren. Kein handgeschriebener SW nötig.

## 2. Update-Verhalten — Entscheidung

Master-Prompt §88: kein Auto-Reload mitten im Workout. `vite-plugin-pwa` mit
`registerType: "prompt"`; Toast "Neue Version verfügbar → Aktualisieren"; vor Reload
sicherstellen, dass das aktive Workout persistiert ist (ist es per Autosave immer).

## 3. Manifest & iPhone — Entscheidung

- Manifest nach openGym-Minimalmuster + Master-Prompt §84: name, short_name, start_url,
  `display: standalone`, background/theme `#0f1012`, Icons 192/512 + maskable.
- iPhone-Metas (§85): `viewport-fit=cover`, `apple-mobile-web-app-capable`,
  `black-translucent`, Apple Touch Icon, `apple-mobile-web-app-title`.
- Safe Areas als CSS-Variablen (`env(safe-area-inset-*)`) in den Design-Tokens.
- Liftosaur bestätigt: Install-Anleitung als eigene Hilfeseite (kein Verlass auf
  beforeinstallprompt in Safari) → "Auf iPhone installieren" unter Mehr/Über (§133).

## 4. Offline-Anspruch

Nach erstem Laden vollständig offline: App-Shell precached, alle Nutzerdaten in
IndexedDB. Online-only bleiben ausschließlich: Open Food Facts, spätere KI, externe
3D-Assets — jeweils mit Fallback (§87).

## Punktetabelle PWA

| Quelle | SW-Qualität | Manifest | iPhone-Details | Update-UX |
|---|---:|---:|---:|---:|
| openGym | **5** | 4 | 3 | 3 |
| Liftosaur | 4 | 5 | **5** | 4 |
| nutritrace | 4 | 4 | 3 | 3 |
| Wingfit | 3 | 3 | 2 | 2 |
| Waistline | 3 | 3 | 2 | 2 |
