# workout-cool — Audit

## Identität
- Original: https://github.com/Snouzy/workout-cool · Lizenz: **MIT**
- Kategorie: Workout · Stack: Next.js 15, TypeScript, Prisma/Postgres, Feature-Sliced Design

## Relevante RED-Fit-Bereiche
Übungen ✅ · Pläne ✅ · Workout ✅

## Kernerkenntnisse für RED Fit
1. **Beste Übungs-Taxonomie im Bestand** (`prisma/schema.prisma`): `Exercise` +
   `ExerciseAttributeName`/`ExerciseAttributeValue` als typisierte Attribut-Enums
   (TYPE, PRIMARY_MUSCLE, SECONDARY_MUSCLE, EQUIPMENT, MECHANICS_TYPE) — flexibel ohne Schema-Wildwuchs.
2. **Programm-Hierarchie**: `Program → ProgramWeek → ProgramSession → ProgramSessionExercise → ProgramSuggestedSet`
   plus `UserProgramEnrollment`/`UserSessionProgress` — sauberes Vorbild für RED Fits Planmodell.
3. `WorkoutSession → WorkoutSessionExercise → WorkoutSet` mit `WorkoutSetType`/`WorkoutSetUnit` Enums.

## Ballast
Next.js-Server, better-auth, Stripe, E-Mail-Templates, Admin, Leaderboard, i18n-Apparat.

## Bewertung (0–5)
Relevanz 4 · Codequalität 4 · Wartbarkeit 4 · Mobile UX 3 · Offline 1 · Tests 2 ·
geringe Abhängigkeitslast 1 · Portierbarkeit 4 (Schema), 2 (App)

## Entscheidung: **PARTIAL**
Kein Code-Extrakt. Taxonomie-Muster dokumentiert in REPORT-WORKOUT.md §5/§6.
