# RED Fit

**Training und Ernährung in einer App.**

Eigenständige, mobile-first PWA fürs iPhone: Trainingspläne, Workout-Logging mit
Pausentimer, Übungsbibliothek, Ernährungstracking (Werte pro 100 g), Wasser,
Körperwerte, Fortschritt, Wochen-Essensplan, Einkaufsliste, Backup — alles lokal
(IndexedDB), offline-fähig, ohne Konto und ohne Backend.

## Status

**Phase 0 abgeschlossen** — Quellenanalyse von 20 Open-Source-Fitness-/Ernährungs-Apps
(aus [`gym-essen`](https://github.com/Redurbabat/gym-essen)) plus dem eigenen Projekt
[`BABAT-RED`](https://github.com/Redurbabat/BABAT-RED). Die Implementierung (Phase 1+)
folgt `docs/phase0/IMPLEMENTATION-ORDER.md`.

## Zielstack

React · TypeScript · Vite · React Router · Dexie/IndexedDB · Zod · Lucide ·
CSS-Variablen · vite-plugin-pwa · Vitest

## Dokumente

| Datei | Inhalt |
|---|---|
| `CLAUDE.md` | verbindlicher Implementierungsauftrag + kritische Regeln |
| `ARCHITEKTUR.md` | Stack, Prinzipien, App-Struktur |
| `AUFGABEN.md` | Phasen-Checkliste (Phase 0 ✅, Phase 1–10 offen) |
| `docs/phase0/SOURCE-MATRIX.md` | Bewertung aller 20 Quellen |
| `docs/phase0/REPORT-*.md` | Erkenntnisse je Fachbereich (Workout, Nutrition, Storage, PWA, Barcode, Meal-Planning, 3D) |
| `docs/phase0/FINAL-*.md` | Datenmodell, Routen, Quellen-Auswahl, Reihenfolge |
| `docs/phase0/audits/` | Einzel-Audits aller Projekte + Archiv-Prüfsummen |
| `sources/own/babat-red/` | eigener Code als Portierungsbasis (u. a. Übungskatalog) |

## Eigenständigkeit

RED Fit gehört vollständig dem Projektinhaber. Aus den analysierten Fremdprojekten
wurden ausschließlich Muster, Feldlisten und Algorithmus-Erkenntnisse dokumentiert —
kein fremder Code ist oder wird Teil dieses Repos.
