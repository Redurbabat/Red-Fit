# Liftosaur — Audit

## Identität
- Original: https://github.com/astashov/liftosaur · Lizenz: **AGPL-3.0**
- Kategorie: Workout · Stack: TypeScript, Preact/React Native, eigene DSL (Liftoscript), Webpack, AWS-Backend (optional) · 1213 TS/TSX-Dateien

## Relevante RED-Fit-Bereiche
Workout ✅ · Übungen ✅ · Pläne ✅ · Progression ✅ · Offline/PWA ✅ · Backup ✅

## Architektur
Local-first PWA. Gesamter App-State (`IStorage`) lebt in IndexedDB (`keyval-store`),
seit 2026 sharded (`storage`/`history`/`programs`/`stats` als getrennte Keys, Schreiben
nur nach bestätigter Transaktion). Fachlogik als reine Funktionen über unveränderliche
Records (`src/models/*`), UI dispatcht Lenses. Valibot validiert jede Struktur zur Laufzeit.

## Kernerkenntnisse für RED Fit
1. **Aktives Workout = normale Entität.** `IHistoryRecord` mit `vtype: "history_record" | "progress"` —
   ein laufendes Workout ist derselbe Datensatz wie ein historisches, nur mit anderem vtype.
   Reload-Sicherheit fällt gratis ab, weil es nie reinen React-State gibt.
2. **Timer als absolute Timestamps.** `timerSince` (Startzeitpunkt) + `timer` (Dauer) statt Countdown;
   `Progress_startTimer` behandelt sogar rückdatierte Starts nach Screen-Lock. Genau das
   Muster für RED Fits `restEndsAt`.
3. **Sets tragen Soll und Ist gleichzeitig**: `reps`/`weight` (geplant) neben
   `completedReps`/`completedWeight`/`completedRpe` — Previous Performance und Plan-Abweichung
   sind damit trivial abfragbar.
4. IndexedDB-Schicht (`utils/indexeddb.ts`): Transaktions-Wrapper, Fehler-Logging,
   `setMany` als Einzeltransaktion für konsistente Shards.

## Storage
IndexedDB Key-Value-Store, Persistence-Manifest mit `formatVersion`, Migrationsordner `src/migrations/`.

## Ballast (nicht übernommen)
AWS/CDK/Lambda, React-Native-Ordner (android/ios/watch), Abo-/Payment-Code, Blog,
Liftoscript-Compiler (mächtig, aber für RED Fit Overkill), 195 PNGs.

## Bewertung (0–5)
Relevanz 5 · Codequalität 5 · Wartbarkeit 4 · Mobile UX 5 · Offline 5 · Tests 4 ·
geringe Abhängigkeitslast 2 · React/TS-Portierbarkeit 5

## Entscheidung: **KEEP**
Kein Code-Extrakt (RED Fit bleibt eigenständig). Muster dokumentiert in REPORT-WORKOUT.md
und REPORT-STORAGE.md. **AGPL → ausschließlich Konzepte übernehmen, Code neu schreiben.**
