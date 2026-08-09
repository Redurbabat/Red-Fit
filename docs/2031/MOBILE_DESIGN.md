# RED Fit 2031 — Mobile Design (Performance Nocturne)

Designsprache: **RED FIT — Performance Nocturne 2031** — dark, graphite,
precise, athletic, premium, quiet, functional. Kein Gaming-Neon, kein
Cyberpunk, keine riesigen Verläufe, kein Glow überall.

## Referenz

- Zielgerät iPhone, Referenzviewport **428 × 926** CSS-Pixel
- Safe Areas (`safe-area-inset-top/bottom`) auf allen Screens; kein Content
  hinter dem Home-Indicator
- Touch-Ziele ≥ 44 px, Inputs ≥ 16 px, kein Hover als einziger Weg,
  keine versteckten Gesten als einziger Weg

## Tokens

Basis bleibt `styles/tokens.css` (Nocturne): bg #0f1012 · surface #1a1b1f ·
text #f4f4f5 · accent #ef4444/#f97316 · protein #38bdf8 · carbs #f59e0b ·
fat #a78bfa · calories #ef4444 · water #06b6d4 · Radius 10/14/18/24 ·
Easing cubic-bezier(0.2, 0.8, 0.2, 1) · 100–320 ms · reduced-motion respektiert.
Eine Umbenennung auf `--fit-*`-Präfixe erfolgt erst mit echtem Mehrwert
(Theme-Fähigkeit), nicht als reine Kosmetik.

## Rot-Bedeutung

Rot für Brand, aktive Trainingselemente, wichtige Primary Actions,
Muskelaktivierung — nicht für jede Zahl und jeden Rahmen.

## Typografie

system-ui/SF Pro (Apple), Inter/system-ui sonst. Screen-Titel 24–28 ·
Section 16–18 · Body 15–16 · Secondary 13–14 · Micro 11–12 · Inputs ≥ 16.

## Komponenten-Regeln

- Bottom Sheets bevorzugt für: Quick Log, Mengen, Filter, Set-Editing,
  Wasser, Messungen, Recovery-Check-in (alles bereits so umgesetzt)
- Keine Card-in-Card-in-Card-Verschachtelung; Sections dürfen offen liegen
- Workout-Modus ist ein Spezial-Screen: eigene kompakte Top-Bar, große
  Bedienelemente, Daumen-Zone-Action-Bar, keine Dashboard-Ablenkung
- FAB (56 px) über der Bottom Nav, im Workout-Modus/Onboarding ausgeblendet

## Haptik & Signal

WebAudio-Signal + `navigator.vibrate` beim Pausenende (im Tap-Gesture
angewaffnet für iOS). Eine `PlatformHaptics`-Abstraktion folgt mit dem
Plattform-Layer (Phase B) — kein Feature darf davon abhängen.
