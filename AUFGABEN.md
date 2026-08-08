# AUFGABEN.md — RED Fit

## PHASE 0 — Quellenanalyse und Konsolidierung ✅ ABGESCHLOSSEN

### 0.1 Archive sichern ✅
- [x] Originale bleiben unverändert in `Redurbabat/gym-essen`
- [x] 53 Teile → 20 Archive zusammengesetzt (`cat *.zip.* > *.zip`)
- [x] Integrität geprüft (`unzip -t`: 20/20 OK)
- [x] SHA256-Prüfsummen dokumentiert (`docs/phase0/audits/ARCHIVE-INTEGRITY.md`)

### 0.2 Projekte rekonstruieren ✅
- [x] alle 20 Projekte entpackt (615 MB, 21.334 Dateien)

### 0.3 Inventarisieren ✅
- [x] Stack, Source Roots, Datenmodelle, Storage, Features je Projekt
- [x] Audits: `docs/phase0/audits/` (Einzel-Audits + Sammel-Audits + BABAT-RED)
- [x] KEEP/PARTIAL/REFERENCE/DROP vergeben (Workout Tracker → DROP)

### 0.4 Bereinigung ✅
- [x] Kein Build-Artefakt, kein node_modules, kein Secret ins Repo übernommen
- [x] Entscheidung Eigenständigkeit: **kein fremder Code im Repo** — nur destilliertes
      Wissen in Reports; einzige Code-Basis ist eigener BABAT-RED-Extrakt (`sources/own/`)

### 0.5 Source Matrix ✅
- [x] `docs/phase0/SOURCE-MATRIX.md` vollständig
- [x] beste Quelle je Fachbereich: `docs/phase0/FINAL-SOURCE-SELECTION.md`

### 0.6 Architektur ✅
- [x] Zielstack fixiert (TS/React/Vite/Dexie/Zod/Lucide/CSS/vite-plugin-pwa/Vitest)
- [x] Datenmodell: `docs/phase0/FINAL-DATA-MODEL.md`
- [x] Storage-Schema: 14 Dexie-Stores + Indizes
- [x] Backup-Format: `red-fit-backup` v1
- [x] Routen: `docs/phase0/FINAL-ROUTES.md`
- [x] Reihenfolge: `docs/phase0/IMPLEMENTATION-ORDER.md`

### 0.7 Themenberichte ✅
- [x] REPORT-WORKOUT · REPORT-NUTRITION · REPORT-STORAGE · REPORT-PWA ·
      REPORT-BARCODE · REPORT-MEAL-PLANNING · REPORT-3D

### Offene Nacharbeiten (blockieren Phase 1 nicht)
- [ ] Red-Max als Quelle nachziehen (vor Phase 13: Three.js/R3F/Dexie-Muster)
- [ ] Redion als Quelle nachziehen (vor P8-Feinschliff: zweite Backup-/Restore-Referenz)
- [ ] Kalender als Quelle nachziehen (vor P7: Wochenansicht-UX)

---

## PHASE 1 — Fundament ✅
- [x] Vite + React + TS strict + Router + ESLint (Scripts: dev/build/preview/typecheck/lint)
- [x] Design Tokens (Nocturne) + base.css + Safe Areas
- [x] Dexie v1: 14 Stores + Indizes + Migrationsgerüst
- [x] Models + Zod-Schemas · utils (dates/ids/numbers)
- [x] Repositories (storage-Schicht)
- [x] AppShell, BottomNav, ErrorBoundary, Toast/Modal/BottomSheet

## PHASE 2 — Onboarding + Seed ✅
- [x] Seed-Logik (einmalig; Basis-Übungen ≠ Demo-Logs)
- [x] Übungskatalog aus `sources/own/babat-red/gym/uebungen.ts` portieren
- [x] Onboarding (5 Schritte) → UserProfile + NutritionGoal

## PHASE 3 — Training (höchste Priorität) ✅
- [x] Übungsbibliothek (Suche, Filter, Custom, Detail + 3D-Platzhalter)
- [x] Pläne + Vorlagen (PPL, Ganzkörper 3T, OK/UK, Zuhause)
- [x] Workout-Modus: aktiver Log, Stepper, Satz fertig, Timer (restEndsAt), Summary
- [x] Resume-Banner + Autosave + History
- [x] calculations/workout.ts (Volumen, PRs, Streak) + Tests

## PHASE 4 — Ernährung ✅
- [x] Foods CRUD + Suche + Favoriten + zuletzt verwendet
- [x] Meal Logging (Live-Berechnung, Snapshot-Entries, editierbar/löschbar)
- [x] Nutrition-Dashboard (Tagesnavigation, Makro-Bars)
- [x] Wasser · calculations/nutrition.ts + Tests

## PHASE 5 — Today-Dashboard ✅
- [x] Greeting, TodayWorkoutCard, MacroSummary, WaterCard, QuickActions, Streak

## PHASE 6 — Fortschritt ✅
- [x] Körperwerte + SVG-Gewichtschart · Trainingsstatistik · Rekorde · Ø kcal/Protein 7 Tage

## PHASE 7 — Planung ✅
- [x] Essensplan (Woche) · Rezepte (MVP) · Einkaufsliste (manuell + aus Plan, Aggregation)

## PHASE 8 — Backup ✅
- [x] Export JSON · Import (Zod, __proto__-Schutz, Vorschau, Merge) + Tests

## PHASE 9 — PWA + iPhone ✅
- [x] vite-plugin-pwa (Prompt-Update) · Manifest + Icons · iPhone-Metas
- [x] Offline-Test · Install-Anleitung · A11y-Pass · Empty States · Responsive-Checks

## PHASE 10 — Abschluss ✅
- [x] typecheck/lint/build grün · 45-Punkte-Checkliste · README · Abschlussbericht

## SPÄTER (nie blockierend)
- [x] Barcode-Kamera (BarcodeDetector) + Open Food Facts (Lookup mit Vorschau)
- [x] 3D: SVG-Figuren + echter Three.js/R3F-Coach (10 Bewegungsmuster, prozedural)
- [ ] KI (Foto→Nährwerte, Empfehlungen)
- [ ] Goal-Timeline, Meal-Plan-Templates, Rezept-URL-Import, Trainings-Heatmap

## RED Fit 2031 — Phase A (Navigation, Körper, Recovery, Quick Log, Coach) ✅

- [x] Navigation 2031: Heute · Training · Ernährung · **Körper** · Mehr (exakt 5 Einträge)
- [x] Körper-Startseite `/body`: Readiness, Gewichtstrend (30 Tage), Körperstatus, Bereichs-Links
- [x] Alte Routen kompatibel: `/progress` bleibt, `/progress/body` → `/body/measurements`
- [x] Recovery-Check-in (Schlaf/Energie/Stress/Muskelkater 1–5, Schlafstunden) — DB v2, additiv
- [x] Erklärbarer Readiness-Score (Faktoren mit Vorzeichen, keine Blackbox) + Tests
- [x] Globales Quick Log: FAB + kontextpriorisiertes Bottom Sheet (Wasser direkt, Gewicht/Recovery als Sheet)
- [x] Heute-Seite: Readiness-Karte + Coach-Sektion (max. 2 deterministische Insights) + Tests
- [x] Backup: recoveryLogs additiv (v1-Backups bleiben importierbar), Vorschau-Label
- [x] docs/2031/ (Vision, IA, Datenmodell V2, 3D-Pipeline, Coach, Mobile Design, Privacy, Integrationen, Migration)
- [x] CLAUDE.md/ARCHITEKTUR.md an Code angeglichen (Three.js-Widerspruch entfernt, Dependency-Regel, Nav 2031)

## RED Fit 2031 — nächste Phasen

- [ ] Phase B: core/-Plattformschicht, Event-System, zentrale Analytics-Engine
- [ ] Phase C: Datenmodell V2 (goals, mediaAssets, progressPhotos additiv), Backup V2, Food-Provenance
- [ ] Phase D: Coach-Ausbau (Weekly Review, Progression-Engine je Plan-Übung), AI-Gateway + Scopes
- [ ] Phase E: 3D-Pipeline (Asset-Manifest, Viewer-Controls, Muscle-Highlighting, Kamera-Presets)
- [ ] Phase F: iPhone-E2E 428×926, Screenshot-Regression, Speicher & Diagnose
