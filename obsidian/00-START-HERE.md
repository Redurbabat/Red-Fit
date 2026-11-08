---
tags: [red-fit, start, project]
updated: 2026-11-08
status: active
---
# RED Fit — Obsidian Startseite

> **Projekt:** [RED Fit](https://github.com/Redurbabat/Red-Fit) (privat). **Ziel:** eine einzige Fitness-App für iPhone, Android, Windows und Web; keine drei parallel laufenden Apps.

**Entscheidung vom 08.11.2026:** openGym ist die eigene Quellcode-Ausgangsbasis von RED Fit, nicht mehr nur Ideenlieferant. [Details](../docs/OPENGYM-BASELINE.md). Quellkopie in `vendor/opengym-upstream/` ist aktuell unvollständig; vollständiger Medien-bereinigter ZIP-Import ist vorbereitet.

## Für neue Chats und Agenten
1. Diese Startseite und [[09-CHAT-HANDOFF]] lesen.
2. [[01-PRODUKT-UND-ZIELE]], [[02-QUELLEN-UND-ARCHIVE]] und [[05-ARCHITEKTUR-PLATTFORMEN]] beachten.
3. [[03-DESIGN-RED-MORPH]], [[04-IPHONEREFERENZ-BBT-BIT]] als Referenzen, nicht als weitere Apps verstehen.
4. Vor Änderungen [[06-LIZENZEN-UND-RECHTE]], [[07-BACKLOG]] und [[08-STATUS-UND-TESTS]] prüfen.
5. Im Repository zuerst `CLAUDE.md`, `ARCHITEKTUR.md`, `docs/INTEGRATION-ROADMAP.md` und aktuellen Code lesen. Code ist maßgeblich, veraltete Notizen korrigieren.

## Wissensbasis
- [[01-PRODUKT-UND-ZIELE]] — Projektentscheidung und Nutzererwartung
- [[02-QUELLEN-UND-ARCHIVE]] — drei ZIPs, Originalprojekte und überprüfte Herkunft
- [[03-DESIGN-RED-MORPH]] — Web-/React-Design-System und Motion
- [[04-IPHONEREFERENZ-BBT-BIT]] — native iPhone UX-Qualitätsreferenz
- [[05-ARCHITEKTUR-PLATTFORMEN]] — shared core, Capacitor, Tauri und Datenmodell
- [[06-LIZENZEN-UND-RECHTE]] — private Nutzung, AGPL, MIT, Medien
- [[07-BACKLOG]] — konkrete verbleibende Aufgaben
- [[08-STATUS-UND-TESTS]] — gesicherter Ist-Stand, Testnachweise und Grenzen
- [[09-CHAT-HANDOFF]] — kopierbarer Arbeitsauftrag für Folgesitzungen
- [[10-DOCK-RED-MORPH]] — Dock im Stil von RED Morph/BBT-Bit (React-Adaption, Teststand)

**Obsidian öffnen:** Repository klonen, Obsidian → `Open folder as vault` → Ordner `obsidian/`. Keine Anmeldung bei Obsidian und keine kostenpflichtige Datenbank erforderlich. Git ist die Synchronisationsquelle dieser Markdown-Notizen; Obsidian Sync wird nicht behauptet oder konfiguriert.

**Regel:** Hier nur dokumentierte Tatsachen als erledigt kennzeichnen. Ein Git-Push ist kein erfolgreicher Gerätebuild.
