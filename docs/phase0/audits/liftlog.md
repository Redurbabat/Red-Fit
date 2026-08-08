# LiftLog — Audit

## Identität
- Original: https://github.com/LiamMorrow/LiftLog · Lizenz: **AGPL-3.0**
- Kategorie: Workout · Stack: React Native/Expo + TypeScript (App), C#/.NET (Backend), Drizzle ORM/SQLite

## Relevante RED-Fit-Bereiche
Workout ✅ · Pläne ✅ · Progression ✅ · Local-first ✅ · AI (Workout-Planner via Backend) ◐

## Kernerkenntnisse für RED Fit
1. `app/src/` zeigt eine saubere RN/TS-Struktur: `models/ services/ store/ db/ hooks/` —
   State-Management getrennt von Persistenz (Drizzle-Schema in `db/schema.ts`).
2. Session-Modell mit "PotentialSet" (geplant vs. ausgeführt) — gleiche Idee wie Liftosaur,
   einfacher umgesetzt.
3. AI-Workout-Planner existiert als getrennter Backend-Service — Beleg dafür, dass
   KI als optionale Randkomponente funktioniert (RED Fit Phase 14).

## Ballast
Gesamtes C#-Backend (976 .cs, RevenueCat-Client!), Expo-Nativeteile, Site/Docs.

## Bewertung (0–5)
Relevanz 4 · Codequalität 4 · Wartbarkeit 4 · Mobile UX 4 · Offline 4 · Tests 3 ·
geringe Abhängigkeitslast 2 · Portierbarkeit 3

## Entscheidung: **PARTIAL** (nur Muster; kein Extrakt nötig — Liftosaur deckt alles besser ab)
