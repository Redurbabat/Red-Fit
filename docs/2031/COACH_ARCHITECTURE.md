# RED Fit 2031 — Coach-Architektur

## Prinzipien

1. **Deterministisch zuerst.** Volumen, PRs, 1RM-Schätzung, Progression,
   Frequenz, Streaks, Makros — alles reine, getestete Funktionen. KI darf
   diese Ergebnisse erklären, nie erfinden.
2. **Erklärbar.** Jede Zahl und Empfehlung zeigt ihr Warum (Readiness-Faktoren,
   Progressions-Begründung „alle Sätze am Ziel").
3. **Kein Suggestion-Overload.** Heute maximal 1–2 Insights; wöchentlich ein
   Review (Phase D). Kein täglicher KI-Feed.
4. **KI schreibt nie still.** Zukünftige AI-Vorschläge laufen immer über
   Suggestion → Preview → Bestätigung → Repository-Write.

## Stand nach Phase A (umgesetzt)

| Baustein | Ort |
|---|---|
| Readiness-Score (0–100, Faktorliste mit Deltas) | `services/calculations/readiness.ts` + Tests |
| Recovery-Check-in (4 Regler + Schlafstunden) | `components/body/RecoveryCheckinSheet.tsx` |
| Insights: Protein-Adhärenz (7 Tage), Wochenpensum vs. Plan, Gewichtstrend | `services/calculations/insights.ts` + Tests |
| Anzeige auf Heute (max. 2 Sätze) | `components/coach/CoachInsightsCard.tsx` |
| Progressions-Vorschlag (Double Progression, begründet) | `services/calculations/workout.ts` (`suggestNextWeight`) |

Readiness ist **keine Medizin**: Fitness-/Recovery-Unterstützung, keine
Diagnose — UI-Texte sind entsprechend formuliert.

## Phase D (geplant)

- **Weekly Review:** Training (n/Plan), Volumen-Δ, Protein-Adhärenz,
  Gewichtstrend, Recovery-Schnitt + 2–3 konkrete Vorschläge.
- **Progression-Engine:** Strategien Double Progression / Fixed Load /
  Rep Progression / RPE-basiert als `progressionRule` je Plan-Übung; jede
  Empfehlung mit Begründung, immer ignorierbar.
- **AI-Gateway (`core/ai/`):** Provider-Interface (generate/analyze,
  supportsImages?/supportsLocal?), Fachmodule kennen keine Provider-Namen.
  Scopes: training.read, nutrition.read, body.read, recovery.read,
  photos.read (Default: **deny**). Vor jeder Anfrage sichtbar: welche Daten
  verwendet werden.
