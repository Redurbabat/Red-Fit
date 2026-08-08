# IMPLEMENTATION-ORDER.md — Reihenfolge der Umsetzung

Aus Master-Prompt §121 + Phase-0-Erkenntnissen. Regel: **vertikale, lauffähige Flows**
statt wochenlanger Abstraktion (§122). Jede Zwischenphase lässt die App startbar.

## P1 — Fundament (zuerst, blockiert alles)
1. Vite + React + TS (strict) + React Router + ESLint; Scripts: dev/build/preview/typecheck/lint
2. Design Tokens (`styles/tokens.css`, Nocturne-Palette §8), Base-CSS, Safe Areas
3. Dexie-DB v1: alle 14 Stores + Indizes (FINAL-DATA-MODEL) + Migrationsgerüst
4. Models (Zod-Schemas + TS-Typen), `utils/dates.ts` (`getLocalDateKey`!), `ids.ts`, `numbers.ts`
5. Repositories (`services/storage/*`): list/get/create/update/delete (+ listByDate, findByBarcode, listActive)
6. AppShell + BottomNav + ErrorBoundary + Toast/Modal/BottomSheet-Layer

**Meilenstein: App startet, DB persistiert, Navigation steht.**

## P2 — Onboarding + Demo-Daten
7. Metadata/Seed-Logik (einmalig, keine Duplikate; Basis-Übungen getrennt von Demo-Logs)
8. Übungskatalog-Seed aus BABAT-RED `uebungen.ts` portieren (Englisch-Codierung, deutsche Inhalte)
9. Onboarding-Flow (5 Schritte) → UserProfile + NutritionGoal

## P3 — Training (höchste Priorität)
10. Übungsbibliothek (Liste, Suche, Filter, Custom, Detail mit 3D-Platzhalter)
11. Pläne: erstellen/bearbeiten/aktivieren + Vorlagen (PPL, Ganzkörper, Oberkörper/Unterkörper, Zuhause)
12. **Workout-Modus**: Start → sofort persistenter `status:"active"`-Log → Gewicht/Reps-Stepper →
    Satz fertig → Timer (`restEndsAt`) → nächste Übung → Abschluss → Summary
13. Resume-Banner, Autosave (§128), History
14. Berechnungen: Volumen, PRs, Streak (`services/calculations/workout.ts`) + Vitest-Tests

**Meilenstein: komplett im Gym nutzbar.**

## P4 — Ernährung
15. Foods: CRUD, Suche, Favoriten, zuletzt verwendet
16. Meal Logging: Typ → Food → Gramm → Live-Berechnung → Snapshot-Entry
17. Nutrition-Dashboard: Tagesnavigation, Makro-Bars, Mahlzeit-Sektionen
18. Wasser (Quick-Buttons, Einträge löschbar)
19. `services/calculations/nutrition.ts` + Tests (Referenzfall: 370 kcal/100 g × 80 g = 296 kcal)

**Meilenstein: Ernährung komplett trackbar.**

## P5 — Today-Dashboard
20. Greeting, TodayWorkoutCard (dayIndex-Logik §37), MacroSummary, WaterCard, QuickActions, Streak

## P6 — Fortschritt
21. Körperwerte (Formular + Historie, append-only) + SVG-Gewichtschart
22. Trainings-/Ernährungsstatistik, Rekorde, Wochen-Streak

## P7 — Planung
23. Essensplan (Woche, Einträge, Tagesmakros)
24. Rezepte (MVP: erstellen, Makros aus Zutaten, als Mahlzeit loggen)
25. Einkaufsliste (manuell + aus Plan generieren mit Aggregation — BABAT-RED-Portierung)

## P8 — Backup
26. Export (`red-fit-backup-YYYY-MM-DD.json`)
27. Import: Zod + `__proto__`-Schutz → Vorschau → Merge → Bericht + Tests

## P9 — PWA + iPhone-Polish
28. vite-plugin-pwa (Prompt-Update), Manifest, Icons (192/512/maskable/Apple Touch)
29. iPhone-Metas, Safe Areas testen, Offline-Smoke-Test, Install-Anleitung
30. Accessibility-Pass (§91), Empty States (§95/155), Responsive-Checks (§114)

## P10 — Abschluss
31. `npm run typecheck && lint && build` grün; manuelle Checkliste §111 (45 Punkte)
32. README + Abschlussbericht (§125)

## Später (blockieren nie)
- Barcode-Kamera (BarcodeDetector) + Open Food Facts (P5-Erweiterung)
- 3D: CSS/SVG-Figur aus BABAT-RED → Three.js/R3F (vorher Red-Max als Quelle nachziehen)
- KI (Fud-AI-Muster) — RED Fit funktioniert vollständig ohne
- Goal-Timeline (SparkyFitness-Idee), Meal-Plan-Templates, Rezept-URL-Import, Heatmap
