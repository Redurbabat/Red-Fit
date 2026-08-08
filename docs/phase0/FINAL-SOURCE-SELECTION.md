# FINAL-SOURCE-SELECTION.md — Beste Implementierung je Fachbereich

Entscheidung **nach Funktion, nicht nach Projekt**. RED Fit ist vollständig eigenständig:
aus fremden Projekten werden nur Muster/Erkenntnisse übernommen (dokumentiert in den
REPORT-Dateien), Code wird neu geschrieben. Einzige direkte Portierungsbasis ist das
eigene Projekt BABAT-RED.

| Fachbereich | Gewinner (Muster) | Zweitquelle | Was konkret übernommen wird |
|---|---|---|---|
| Workout-Modus / Active-Resume | **Liftosaur** | LiftLog | Aktives Workout als persistenter Datensatz (`status:"active"`), Autosave, Resume-Banner |
| Set-Logging-Modell | **Master-Prompt §17** | Flexify (simpel), Liftosaur (Soll/Ist) | SetLog mit completed-Feldern; Plan-Soll getrennt vom Ist |
| Pausentimer | **Liftosaur** | Flexify | absolute Timestamps (`restEndsAt`), Neuberechnung bei Resume |
| Progression | **BABAT-RED** (eigener Code) | Liftosaur | `GymProgressionService`: Double Progression, +2,5 kg |
| PRs / Statistik | **BABAT-RED** (eigener Code) | Liftosaur | `bestwert()`, Wochenstatistik, Volumen inkl. Körpergewichtsübungen |
| Übungsbibliothek (Inhalt) | **BABAT-RED** (eigener Code) | wger-Vokabular | `uebungen.ts` als Seed: Schritte/Fehler/Tipp deutsch |
| Übungs-Taxonomie | **workout-cool** (Muster) | wger | primary/secondary muscle, equipment, difficulty |
| Trainingsplan-Modell | **Master-Prompt §16** | workout-cool | Plan→Session→Exercise, dayIndex optional |
| Food-Modell (100 g) | **OpenNutriTracker** (Muster) | wger | Feldliste, 100 g als Source of Truth, Barcode als String |
| Nutrition-Berechnung | **BABAT-RED** (eigener Code) | Calories-In (Muster) | Makro-/Mengenservices mit Tests; Prozent-Rundung auf 100 % |
| Meal Log / Snapshot | **OpenNutriTracker** (Muster) | — | Entry speichert foodName + berechnete Werte |
| Barcode-Fallback-Kette | **OpenNutriTracker** (Muster) | Waistline | manuell → lokal suchen → erstellen; Scanner optional via BarcodeDetector |
| Open Food Facts (später) | **OpenNutriTracker** (Muster) | nutritrace | Feld-Mapping, Einheiten-Normalisierung, Vorschau vor Speichern |
| Rezepte | **Master-Prompt §27** | Mealie (Muster) | Zutaten→Makros pro Portion (BABAT-RED-Rechnung) |
| Essensplan | **BABAT-RED** (eigener Code) | Mealie, Calories-In | Plan→Tag→Eintrag (foodId/recipeId/label) |
| Einkaufslisten-Aggregation | **BABAT-RED** (eigener Code) | Mealie `merge_items` (Korrektheits-Referenz) | Gruppieren nach Food+Einheit, Mengen summieren |
| Storage | **Dexie** (Nutzer-Entscheid) | Liftosaur (Fallstricke) | 14 Stores, Indizes, additive Migrationen |
| Backup | **BABAT-RED** (eigener Code) | Calories-In (Muster) | Envelope-Format, Zod-Import, `__proto__`-Schutz, Merge-Vorschau |
| PWA / Service Worker | **vite-plugin-pwa** (Nutzer-Entscheid) | openGym (Strategie-Muster) | Precache, network-first-Navigation, Update-Prompt |
| iPhone-UX | **Master-Prompt §§85–90** | Liftosaur | Safe Areas, 16-px-Inputs, inputmode, Standalone |
| 3D (Phase 13) | **BABAT-RED** (eigener Code) | wger-Muskelkarte | erst Placeholder, dann CSS/SVG-Figur, dann Three.js/R3F |
| KI (Phase 14) | **Fud AI** (Muster) | LiftLog | OpenAI-kompatibler Client als optionaler Service |

## Ausdrücklich NICHT übernommen

- Liftoscript-DSL (Liftosaur) — programmierbare Progression ist kein MVP-Bedarf
- Server-Architekturen (wger, Mealie, Tandoor, SparkyFitness, workout-cool)
- Rezept-URL-Import-Parser (Mealie/Tandoor) — Post-MVP
- GPX/Cardio-Tracking (Workout Tracker — DROP)
- jegliche Konto-/Abo-/Payment-Logik
