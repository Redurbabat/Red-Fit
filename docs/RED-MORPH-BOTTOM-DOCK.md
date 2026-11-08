# RED Fit – Bottom Dock nach RED Morph / BBT-Bit

Stand: 2026-11-08. Umsetzung im gemeinsamen React-/TypeScript-Core.

## Ziel und Grenzen

Die fünf primären RED-Fit-Bereiche (Heute, Training, Ernährung, Körper, Mehr) nutzen jetzt genau eine schwebende Navigation. Vorbild sind die RED-Morph-Bewegungssprache und das native BBT-Bit-Tab-Minimierungsverhalten. **Dies ist React/CSS, keine SwiftUI-TabView**. Weder BBT-Bit-Audiocode noch Mini-Player oder Music Island sind Bestandteil von RED Fit.

## Implementierte Interaktion

- Standardzustand: großes schwimmendes Dock mit Symbolen und Beschriftung; beim Runterscrollen ab 132 px wird es kompakter, beim Hochscrollen wieder ausgeklappt.
- Kleine Scroll-Events werden richtungsabhängig summiert, um Touch und Trackpad zu berücksichtigen.
- Fünf echte Links bleiben in beiden Zuständen erreichbar (mindestens 44 px hohe Touchflächen); aktive Unterseiten behalten den passenden Haupt-Tab. Die alte /progress-Route gehört zu Körper.
- Safe Areas und das bestehende Quick Log werden berücksichtigt. Ein Routenwechsel setzt das Dock über einen React-Key auf den ausgeklappten Zustand zurück.
- Desktop ab 1024 px verwendet weiter die bestehende Sidebar. Onboarding und aktiver Workoutmodus bleiben fullscreen.
- RED Fit Nocturne bleibt das Theme; Blur nur am Dock. Reduce Motion und Reduce Transparency haben ruhige/undurchsichtige Alternativen.

## Quell- und Qualitätsnachweis

Implementierung: src/components/layout/BottomNav.tsx, dockBehavior.ts, src/app/AppShell.tsx, src/styles/mobile.css, tokens.css, components.css.
Tests: tools/dock-behavior.selftest.mjs und src/components/layout/BottomNav.test.tsx.

**Tatsächlich ausgeführt:** 7/7 isolierte Node-Tests auf Node 22.16.0 erfolgreich; drei neue TypeScript/TSX-Dateien syntaktisch ohne Fehler transpiliert. Vollständiger npm-/Vitest-/Vite-Build sowie Cloudflare- und iPhone-/Android-Tests **nicht** ausgeführt.

## Nächste Abnahme

npm ci && npm run typecheck && npm run lint && npm run test && npm run build && npm run test:offline

Manuell: 320/360/390/430 px, hell/dunkel, iPhone Safe Areas, Android, Desktop, volle/kompakte Leiste, Unterseiten, Quick Log, reduziert Bewegung/Transparenz, Tastatur und Screenreader.

## Referenzen

- RED-Morph: skills/red-morph/SKILL.md und references/STYLE_CONTRACT.md im Repository Redurbabat/RED-Morph.
- RED Bit / BBT-Bit: docs/DESIGN_SYSTEM.md im Repository Redurbabat/BBT-Bit (native SwiftUI-Verhaltensreferenz; kein Copy-Paste).
