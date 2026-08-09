# RED Fit 2031 — 3D-Pipeline

## Ist-Stand (weiter als die alte Doku)

- `ExerciseCoach3D` (R3F, lazy — three ist NICHT im Initial-Bundle):
  prozeduraler Coach mit 10 Animationstypen, OrbitControls.
- `ModelCoach`: lädt echte GLBs (`public/models/<übungs-id>.glb` oder
  `exercise.animation3dUrl`), normalisiert auf 1,75 m, spielt bevorzugt den
  Clip „exercise"; bei Fehlern automatischer Fallback auf den prozeduralen
  Coach. **Der prozedurale Coach bleibt dauerhaft als Fallback.**

## Zielpipeline

Blender → rigged Master Character → Übungs-Animation → GLB →
Asset-Manifest → R3F Exercise Viewer.

## Master Character (verbindlich für Blender-Produktion)

- EIN gemeinsamer Master (humanoid, neutral-athletisch, saubere Materialien,
  stabile Skeleton-Hierarchie, konsistente Skalierung ~1,75 m, Ursprung Füße).
- **Bone Contract:** hips, spine, chest, neck, head; upperArm/lowerArm/hand
  je .L/.R; upperLeg/lowerLeg/foot je .L/.R.
- **Clip Contract:** bevorzugt `exercise` (Loop); optional idle/setup/finish.
  Existiert nur ein Clip, wird der erste kontrolliert verwendet (bereits so
  implementiert in `ModelCoach`).

## Muscle Highlighting (Phase E)

Adressierbare Material-Zonen am Master (MAT_CHEST, MAT_BACK, MAT_SHOULDERS,
MAT_BICEPS, MAT_TRICEPS, MAT_ABS, MAT_GLUTES, MAT_QUADS, MAT_HAMSTRINGS,
MAT_CALVES + MAT_SKIN). Primär = Rot, Sekundär = Orange, Stabilisatoren
optional gedämpftes Gelb — zur Laufzeit über Materialparameter, nie über
zerstörte Basistexturen. Quelle der Muskel-IDs: zentrale Taxonomie
(`MuscleGroup` in `models/exercise.ts`), dieselbe wie Übungen/Analytics/MuscleMap.

## Asset-Manifest (Phase E)

Kein GLB-URL-Hardcoding in Screens. Zod-validiertes Manifest je Übung:
`exerciseId, modelUrl, animationClip, duration, cameraPreset, equipment,
primaryMuscles, secondaryMuscles, version` (+ optional LOD-Varianten
mobile/high). Kamera-Presets je Übung (squat: 3/4-seitlich, bench: seitlich,
lateral raise: front-3/4).

## Viewer (Phase E)

Play/Pause · Speed 0,5/0,75/1/1,25 · Rotate/Zoom · Reset Camera · optional
Front/Seite/Rücken · Muscle-Toggle. Lazy, Asset-Cache, Low-Power/Reduced-Motion
respektieren; bei Fehler SVG/Text-Fallback (heute schon: SVG-Figur).

## Performance-Regeln (gelten ab sofort)

three/R3F nie im Initial-Bundle · GLBs erst bei Bedarf · gecachte Assets
offline nutzbar · E2E prüft: Canvas sichtbar, nicht schwarz, Fallback bei
Asset-Fehler (Phase F).
