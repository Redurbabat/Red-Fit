---
tags: [red-fit, design, red-morph]
updated: 2026-11-08
---
# RED Morph — verbindliche Designreferenz

**Quelle:** privates GitHub-Repository [Redurbabat/RED-Morph](https://github.com/Redurbabat/RED-Morph). Maßgeblich sind `skills/red-morph/SKILL.md`, `docs/design/RED_MORPH_SYSTEM.md`, `app/src/touch/README.md` sowie das dortige `CLAUDE.md`.

## Übernahme in RED Fit
- **Ruhig im Ruhezustand, präzise bei Interaktion**; Zweck vor Effekt.
- Semantische Tokens für Farbe/Abstand/Typografie/Tiefe. Bestehende RED-Fit-Nocturne-Farben nicht blind überschreiben.
- Opaque Content-Surfaces; Glass selektiv für Floating Chrome/Sheets.
- Zustandsorientierte Mikrointeraktionen: Press 100–180 ms; Switch 180–300 ms; Card→Detail 280–520 ms; unterbrechbar und mit sichtbarem Endzustand.
- Ziel: Touch >= 44x44 pt, tastaturbedienbare Aktionen, Screenreader und Fokus, Safe Areas, Reduced Motion/Transparency, heller/dunkler Modus.
- Web/React-Bausteine aus RED Morph `app/src/touch/` sind **potenziell** übernehmbar, **erst** nach API-/Lizenz-/CSS-Namensraum-/Bundle-/A11y-/Regressionstest. Nicht die gesamte Demo-Galerie kopieren.
- Bestandsschutz: RED-Fit-Workouts, Notizen, Timer, Backup und offline gespeicherte Daten bleiben funktional.

## Abgrenzung
Ein React-Demo ist keine SwiftUI-Komponente. Das RED-Morph-Designsystem liefert Stil- und Interaktionsentscheidungen; das produktive Runtime-Framework in RED Fit bleibt React/TypeScript. BBT-Bit-Music-Island ist nur eine Qualitätsmetapher, kein Bedarf für einen Musikplayer.

## Umsetzungsreihenfolge
1. Ist-Zustand eines echten RED Fit Screens erfassen.
2. KEEP / REWORK / LAB / DELETE-CANDIDATE für vorhandene Komponenten dokumentieren (keine Massenlöschung).
3. Einen echten Screen (zuerst Today oder Workout) mit Tokens und Zuständen verbessern; keine Fake-Interaktionen.
4. iPhone-Breite, Android, Desktop, Tastatur, Kontrast und Reduce Motion prüfen.
5. Erst nach Tests auf weitere Screens ausweiten.
