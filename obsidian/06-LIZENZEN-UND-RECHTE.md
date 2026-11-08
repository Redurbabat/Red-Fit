---
tags: [red-fit, licenses, privacy, safety]
updated: 2026-11-08
---
# Rechte, Lizenzen, Privatheit

**Nutzeranweisung:** RED Fit ist privat und soll privat bleiben; der Nutzer bezeichnet openGym als seine zweite App. Das ist eine Projektzuordnung, **kein** Nachweis der ausschließlichen Rechte an sämtlichem Drittmaterial der ZIP.

| Quelle | in Archiv geprüfte Angaben | Regel |
|---|---|---|
| Dietry | `LICENSE`: MIT, Copyright (c) 2026 tcriess | Quellübernahme grundsätzlich mit Copyright-/Lizenzhinweisen möglich; Abhängigkeiten separat prüfen |
| wger | AGPL-3.0 | Bei Codeübernahme, Kombination und Verteilung Auswirkungen auf RED Fit prüfen; Attribution/Quellpflichten beachten |
| openGym | `LICENSE`: AGPLv3; `NOTICE.md`: Duarte Santos | Übernahme von AGPL-Code nur mit dokumentierter Compliance-/Kompatibilitätsentscheidung |
| openGym Übungsanimationen | `NOTICE.md`: Gym visual, gesonderte Rechte | **Nicht** in RED Fit übernehmen oder hotlinken; nicht zur KI-Generierung als Vorlage verwenden; ggf. Direktlizenz |
| RED-Morph / BBT-Bit | getrennte Repositories mit eigenen Quell-/Drittregeln | Designprinzipien übernehmen; Code nur nach konkreter Lizenz-/Abhängigkeitsprüfung |

**Privat ≠ rechtlich frei.** GitHub private visibility ersetzt keine Rechte zur Weitergabe, App-Store-Veröffentlichung oder Nutzung separat lizenzierter Assets. Vor einem Store-Release AGPL- und Apple/Google-Bedingungen fachkundig klären. Vorläufig bevorzugt: eigene funktionale RED-Fit-Implementierung auf Basis geprüfter Ideen und offen attribuierter Daten.

**Sicherheitsregeln:** Keine `.env`-Werte/Secrets, Auth-Tokens, Schlüssel, echten Nutzer-DBs oder Personenfotos in Git. Kein automatischer Import kompletter ZIPs. Bei Drittquellen Security- und Lizenzscan. Keine unbestätigte Datenlöschung. Backups nur nutzerinitiiert.
