# REPORT-3D.md — 3D-Übungsdarstellung (Phase 13)

Untersucht: BABAT-RED (GymMotionFigure, GymExerciseScene, GymKineticCore, RedHuman),
Liftosaur (SVG-Muskelkarten), wger (Muscle-Modell mit `is_front`).

## Befund

- **Keine der 20 gym-essen-Quellen hat echte 3D-Übungsanimationen.** Liftosaur nutzt
  SVG-Muskel-Overlays, wger statische Bilder + Muskelkarte (vorne/hinten).
- **BABAT-RED ist die einzige Quelle mit eigener Bewegungs-Visualisierung**:
  `GymMotionFigure`/`GymKineticCore` (animierte Figur, CSS/SVG-basiert) und
  `RedHuman` (Anatomie-Ansicht). Three.js ist in BABAT-RED als Dependency vorhanden.

## Entscheidung für RED Fit

1. **MVP (Phase 3)**: `Exercise3DPlaceholder` — Titel "3D-Animation", Text
   "Hier erscheint später die Bewegungsanimation dieser Übung." + optionale einfache
   CSS-Demo. Textanleitung (Schritte/Fehler/Tipp aus BABAT-RED-Katalog) ist immer da.
   Keine 3D-Dependency installieren (Master-Prompt §104).
2. **Phase 13a**: BABAT-REDs CSS/SVG-Bewegungsfigur portieren (eigener Code) —
   günstiger Zwischenschritt vor echtem 3D.
3. **Phase 13b**: Three.js + React Three Fiber (Muster aus Red-Max, sobald als Quelle
   verfügbar), GLB/GLTF pro Übung, Play/Pause, Kamera. `Exercise.animation3dUrl?`
   ist dafür bereits im Datenmodell vorgesehen.
4. Muskelgruppen-Hervorhebung: wger-Muskelkarte (vorne/hinten, `is_front`) als
   Datenvorbild für eine 2D-Körpergrafik vor echtem 3D.

## Hinweis Red-Max / Redion / Kalender

Die eigenen Projekte Red-Max (Three.js/R3F/Dexie-Muster), Redion (Backup/Restore/
Migrationen) und Kalender (Wochenansichten) waren in dieser Phase-0-Runde **nicht als
Quelle verfügbar** (kein Zugriff im Arbeitsbereich). BABAT-RED deckt die Kernbedarfe ab;
Red-Max sollte vor Phase 13 nachgezogen werden, Redion vor Phase 11 als zweite
Backup-Referenz. In `AUFGABEN.md` als offene Punkte vermerkt.
