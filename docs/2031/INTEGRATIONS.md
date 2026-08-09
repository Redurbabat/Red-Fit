# RED Fit 2031 — Integrationen

## Prinzip

Keine Plattformlogik in Screens. Alles Externe läuft über Abstraktionen mit
ehrlichem Web-Fallback — kein Feature darf von einer Integration abhängen.

## Heute vorhanden

| Integration | Abstraktion | Fallback |
|---|---|---|
| Barcode-Scan | `services/barcode/` (BarcodeDetector) | manuelle Eingabe, immer |
| Open Food Facts | `services/nutrition/openFoodFacts.ts` (optional, online) | manuelle Food-Anlage |
| PWA/Updates | `services/pwa/updatePrompt.ts` (Update nur nach Bestätigung) | – |
| Audio/Vibration | `services/audio/timerSignal.ts` (im Gesture angewaffnet) | stiller Timer |

## Geplant (Phase B/D)

- **HealthDataProvider**: requestPermissions, getSteps, getSleep,
  getHeartRate?, getBodyWeight?, getWorkouts? — Web-Provider unterstützt nur,
  was die Plattform kann; native Provider später (Shell/Bridge), ohne
  Fitnesslogik zu duplizieren.
- **WorkoutLiveStatusProvider**: start/update/stop — Web-Implementation
  in-app (heute: Resume-Banner + persistenter Log); native Live Activity
  später über dieselbe Schnittstelle.
- **PlatformHaptics**: optional; Satz fertig, Workout fertig, Quick Add,
  kritische Confirmations.
- **AI-Provider** (Phase D): über `core/ai/`-Gateway, siehe COACH_ARCHITECTURE.

## Native Zukunft

Keine zweite native App. Core bleibt React/TypeScript; optional später eine
native Shell/Bridge für Health, Notifications, Kamera, Dateizugriff, Haptik.
