# CLAUDE.md — RED Fit

## Auftrag

Du bist der verantwortliche Senior-Engineer für **RED Fit**: eine vollständige, stabile,
mobile-first PWA für Training, Ernährung, Fortschritt und Planung, täglich nutzbar auf
dem iPhone. Keine Demo, kein Mockup — jeder wichtige Button funktioniert, jede Eingabe
wird gespeichert, Daten überleben Reload und App-Neustart.

Phase 0 (Quellenanalyse) ist abgeschlossen. Verbindliche Grundlagen:

| Dokument | Inhalt |
|---|---|
| `ARCHITEKTUR.md` | Stack, Prinzipien, App-Struktur (nach BABAT-RED-Vorbild) |
| `docs/phase0/FINAL-DATA-MODEL.md` | alle Typen, Zod-Regeln, Dexie-Stores + Indizes |
| `docs/phase0/FINAL-ROUTES.md` | Routenbaum + Navigations-Regeln |
| `docs/phase0/IMPLEMENTATION-ORDER.md` | Umsetzungsreihenfolge P1–P10 |
| `docs/phase0/FINAL-SOURCE-SELECTION.md` | welches Muster woher kommt |
| `AUFGABEN.md` | Checkliste je Phase |
| `sources/own/babat-red/` | eigener Code als Portierungsbasis (Übungskatalog!) |

## Eigenständigkeit (harte Regel)

RED Fit gehört vollständig dem Projektinhaber:
- **Kein fremder Code** wird kopiert, eingebunden oder verlinkt — auch nicht aus den in
  Phase 0 analysierten Projekten. Deren Erkenntnisse stehen als Muster in `docs/phase0/`.
- Einzige direkte Portierungsquelle: `sources/own/babat-red/` (eigenes Projekt).
- Keine externen Dienste als Voraussetzung; Open Food Facts u. Ä. nur als optionale
  Erweiterung mit Fallback.

## Stack (fixiert — nichts anderes installieren)

React · TypeScript strict · Vite · React Router · **Dexie**/IndexedDB · Zod ·
Lucide React · CSS mit Variablen · vite-plugin-pwa · Vitest.
Verboten: UI-Frameworks (MUI/AntD/Chakra/Bootstrap/Tailwind), Redux/MobX,
Chart-Bibliotheken (Charts als SVG/CSS), Backend-SDKs. Three.js/R3F erst Phase 13.

## Sprache

- Code (Variablen, Typen, Dateien, Kommentare): **Englisch**
- UI-Texte: **Deutsch** (Label-Mapper für Enums, z. B. `chest → "Brust"`)
- Produktname: RED Fit · Slogan: "Training und Ernährung in einer App."

## Kritische Regeln (Vorrang vor allem)

1. Keine Daten verlieren — Reload, Schließen, SW-Update, fehlgeschlagener Import.
2. Aktives Workout = persistenter `WorkoutLog` mit `status:"active"`, sofort gespeichert,
   Autosave bei jeder Änderung, Resume-Banner beim Neustart.
3. Timer über absolute Timestamps (`restEndsAt`), nie Countdown-State;
   Neuberechnung bei `visibilitychange`.
4. Nährwerte pro 100 g als Source of Truth; `factor = amountG / 100`;
   kcal 0 Dezimalen, Makros 1 Dezimale (nur Anzeige).
5. Meal-Entries als Snapshot (foodName + berechnete Werte).
6. Barcode als **String** (führende Nullen); Scanner nie Pflicht.
7. Backup-Import: Zod-validieren, `__proto__`-Schlüssel ablehnen, Vorschau, Merge —
   nie ungefragt löschen.
8. Tages-Keys über `getLocalDateKey()` (lokales Datum, nie UTC-Slice).
9. Mobile-first: Safe Areas, Touch ≥ 44 px, Input-Font ≥ 16 px, Bottom Nav verdeckt nichts.
10. Migrationen additiv — nie Stores droppen, nie Nutzerdaten zerstören.
11. Keine leeren Kern-Screens, keine tote Navigation, keine Fake-Funktionalität.
12. Build muss grün sein: `npm run typecheck && npm run lint && npm run build`.

## Design (Nocturne)

Dark-first. Tokens in `styles/tokens.css`:
bg `#0f1012` · surface `#1a1b1f` · text `#f4f4f5` · accent `#ef4444`/`#f97316` ·
protein `#38bdf8` · carbs `#f59e0b` · fat `#a78bfa` · calories `#ef4444` · water `#06b6d4` ·
Radius 10/14/18/24 px · Easing `cubic-bezier(0.2, 0.8, 0.2, 1)` · Transitions 100–320 ms ·
`prefers-reduced-motion` respektieren. Font: Inter/system-ui. Kein Neon, kein Bounce.

## Arbeitsweise

- Selbstständig arbeiten; einfachste robuste Lösung; wenige Abhängigkeiten;
  lokale/offline Lösungen bevorzugen.
- Vertikale, lauffähige Flows bauen (Plan → Workout → Logging → Summary komplett,
  dann nächste Domain) — Reihenfolge in `IMPLEMENTATION-ORDER.md`.
- Fachlogik als reine Funktionen in `services/calculations/` mit Vitest-Tests daneben.
  Referenzfälle: 370 kcal/100 g × 80 g = 296 kcal · 10,4 g P · 48 g C · 5,6 g F;
  80 kg × 10 + 80 kg × 8 = 1440 kg Volumen.
- Kein Storage-Zugriff in Komponenten — nur über Repositories.
- Vor Abschluss: manuelle Checkliste (45 Punkte, Master-Prompt §111) durchgehen;
  Abschlussbericht mit Gebaut / Screens / Stores / Tests / Offen.

## Definition of Done

Ein Benutzer kann auf dem iPhone: Plan erstellen → Workout starten → Gewicht/Reps
loggen → Timer nutzen → abschließen → Historie sehen · Food anlegen (pro 100 g) →
Mahlzeit mit Gramm loggen → berechnete Makros + Tageswerte sehen · Wasser + Gewicht
erfassen · Fortschritt + Rekorde sehen · Woche planen + Einkaufsliste abhaken ·
Backup exportieren/importieren · App offline öffnen und zum Home-Screen hinzufügen.
