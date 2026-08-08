# openGym — Audit

## Identität
- Original: https://github.com/DuarteSantos8/openGym · Lizenz: **AGPL-3.0**
- Kategorie: Workout · Stack: React (JSX), Vite, Express-API, Zustand-ähnlicher Store

## Relevante RED-Fit-Bereiche
Workout ✅ · Offline/PWA ✅✅

## Kernerkenntnisse für RED Fit
1. **Bestes PWA-Vorbild im Bestand.** `sw.js` ist 60 Zeilen und deckt alles ab:
   - Media (img/gif) cache-first
   - alles andere network-first mit Cache- und `index.html`-Fallback
   - `/api/` wird nie gecacht
   - Push + notificationclick sauber implementiert
2. Manifest: minimal korrekt (`standalone`, `portrait`, maskable Icon, Theme-Color).
3. View-Struktur (Home/Plan/Workout/History/Stats/Library/Settings) entspricht fast 1:1
   RED Fits Bottom-Nav-Schnitt.

## Ballast
Express-API (Login/Server-Persistenz), Website-Ordner, Android-Wrapper.

## Bewertung (0–5)
Relevanz 3 · Codequalität 3 · Wartbarkeit 3 · Mobile UX 4 · Offline 5 · Tests 1 ·
geringe Abhängigkeitslast 4 · Portierbarkeit 4

## Entscheidung: **PARTIAL**
Kein Code-Extrakt. Caching-Strategie dokumentiert in REPORT-PWA.md; Umsetzung erfolgt
über vite-plugin-pwa, damit ohnehin generiert.
