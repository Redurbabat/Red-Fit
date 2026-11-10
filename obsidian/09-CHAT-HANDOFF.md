> **Aktueller Integrationsstand 10.11.2026:** Weiter auf PR #17 / `integration/red-fit-opengym-iphone-20261110`. Neue Marke: Bordeaux/Elfenbein, drei abstrakte fließende Formen, **keine Buchstaben/Hantel**. `docs/design/RED-FIT-BRAND-INTEGRATION.md` und den neuesten Abschnitt von `08-STATUS-UND-TESTS.md` lesen. Die Quell-PRs sind integriert; keine zweite App bauen. Native iPhone-Abnahme/Signing bleiben gesondert zu belegen.

---

> **HÖCHSTE PRIORITÄT 09.11.2026:** **Nicht neue RED Fit App entwickeln.** Die bereits vollständige **originale openGym-App** in `vendor/opengym-upstream/` direkt als **RED Fit** weiterentwickeln und umbenennen. **Zuerst die bestehende iOS-/iPhone-App bauen und auf dem Gerät testen.** Root-`src/` ist Legacy/Referenz für Ernährung. Fünf bestehende getrennte Agenten-Branches, keine Selbst-Merges. Verbindlich: [docs/OPEN-GYM-IS-RED-FIT.md](../docs/OPEN-GYM-IS-RED-FIT.md). Der folgende ältere Text über einen unvollständigen Quellimport ist überholt.
tags: [red-fit, handoff, agent]
updated: 2026-11-08
---
# Handoff an jeden neuen Chat / AI-Agenten

## Arbeitsauftrag zum direkten Aufgreifen

**NEUE PRIORITÄT DES EIGENTÜMERS (08.11.2026):** openGym ist sein eigenes Repository. Es soll **1:1 als neue Entwicklungsbasis** übernommen werden, danach RED Fit ab dort weiterentwickeln. Die bisherige Architekturentscheidung „nur Ideen übertragen“ ist dafür überholt. Original-Code unter `vendor/opengym-upstream/` bereits teilweise auf `main`, Quellen-/Importanleitung unter `docs/OPENGYM-BASELINE.md`; die vollständige unveränderte Quellkopie ohne Gym-visual-Medien liegt bislang nur als geprüfter Chat-ZIP-Export vor, NICHT komplett in GitHub. **Jetzt Quellimport vervollständigen, dann aus originalem Frontend/API einen nachgewiesenen Build mit sicherer Migration ableiten.** Bestehenden RED-Fit-Core erst nach erfolgreichem Cutover ersetzen.

Arbeite im privaten GitHub-Repository **Redurbabat/Red-Fit**. Der Nutzer will aus **openGym, wger und Dietry EINE RED Fit App** für **iPhone/iOS, Android, Windows und Web**. RED-Morph (`Redurbabat/RED-Morph`) liefert **nur** Design-/Touch-/Motion-Referenzen; BBT-Bit (`Redurbabat/BBT-Bit`) liefert **nur** iPhone-/SwiftUI-UX-, A11y- und native Testreferenzen. Keine Musikfunktionen oder weitere eigenständige App zusammenführen. RED Fit soll **privat** bleiben.

**Start:** `AGENTS.md`, `CLAUDE.md`, `ARCHITEKTUR.md`, `obsidian/00-START-HERE.md`, `obsidian/07-BACKLOG.md`, `obsidian/08-STATUS-UND-TESTS.md` lesen; danach tatsächlichen `main`-Code prüfen. Der Projektinhaber hat direkte Pushes auf `main` für den aktuellen Auftrag angeordnet; niemals ungetestete/destruktive Änderungen als fertig ausgeben.

**Technik:** React/TypeScript, Vite, Dexie/IndexedDB als Single Source of Truth, Browser-PWA, Capacitor iOS/Android, Tauri 2 Windows. Kein Full-Stack-Monolith aus Flutter + Django + Node und keine unnötige native Neuimplementierung. Vorhandene Workout-/Nutrition-/Backup-Integrität bewahren.

**ZIPs:** `openGym-main(1).zip`, `wger-master(1).zip`, `dietry-main(1).zip` wurden in der ursprünglichen Chat-Sitzung geprüft. Sie werden durch den Vault **nicht** automatisch als echte ZIP-Bytes in anderen Chats zugänglich; SHA-256 und Befunde in [[02-QUELLEN-UND-ARCHIVE]]. Quellbaum-/Asset-Übernahme nur nach Lizenz-/Secret-Audit. openGym-`catalogue/media/` ist separat von Gym visual lizenziert; keinesfalls ohne Direktlizenz wiederverwenden, auch nicht bei privatem RED Fit. Der Nutzer bezeichnet openGym als eigene zweite App; Drittanbieterrechte bleiben separat.

**Next task:** Aktuellen GitHub-Stand mit [[07-BACKLOG]] abgleichen, kleinsten noch offenen vertikalen Funktionsweg umsetzen, Tests real ausführen (oder explizit als nicht ausgeführt markieren), Commit/Dateien und nächstes To-do hier dokumentieren. Erst bei nachgewiesenem Test/Build „fertig“ schreiben. Keine bloßen Planungsrunden wiederholen.

**Hinweis zur Chatübergreifenden Kontinuität:** Die zuverlässige Quelle ist das GitHub-Versionierungsverzeichnis `obsidian/`, nicht ChatGPT-Memory oder ein implizit geteilter Chatverlauf. Neue Chats mit Zugriff auf das Repository können diese Notes direkt lesen.
