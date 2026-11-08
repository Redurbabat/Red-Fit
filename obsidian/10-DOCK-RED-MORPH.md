---
tags: [red-fit, design, dock, red-morph, bbt-bit]
updated: 2026-11-08
status: implemented-unverified-ui
---
# RED-Morph-Dock für RED Fit

Die untere RED-Fit-Navigation ist nun ein einzelnes Floating Dock: fünf echte Bereiche, ausgeklappt bei Seitenbeginn, kompakt beim Scrollen nach unten und wieder ausgeklappt beim Scrollen nach oben. /progress wird visuell dem Körper-Tab zugeordnet. Die Quick-Log-Schaltfläche bleibt erhalten.

RED-Morph liefert die Designsprache, BBT-Bit dient als iPhone-Navigationsreferenz. React/Capacitor kann das native SwiftUI-Verhalten nur funktional adaptieren: kein echter Apple-TabView, kein Music Island und kein BBT-Audiocode.

Code: BottomNav.tsx, dockBehavior.ts, AppShell.tsx, mobile.css, tokens.css, components.css. Tests: tools/dock-behavior.selftest.mjs und BottomNav.test.tsx.

Ausgeführte Tests: 7/7 isolierte Node-Scrolltests erfolgreich sowie Syntaxprüfung für drei TS/TSX-Module. Vollständige App-Tests und echte Geräte/Cloudflare-Builds sind noch offen.

Siehe [Dock-Spezifikation](../docs/RED-MORPH-BOTTOM-DOCK.md) und [[08-STATUS-UND-TESTS]].
