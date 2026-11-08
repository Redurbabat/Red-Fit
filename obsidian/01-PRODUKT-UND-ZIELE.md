---
tags: [red-fit, product, decision]
updated: 2026-11-08
---
# Produktziel: EINE RED Fit App

## Verbindlicher Auftrag des Projektinhabers
- Alle geeigneten Funktionen und Datenmodelle aus `openGym-main`, `wger-master` und `dietry-main` sollen in **RED Fit** zusammenkommen.
- Die fertige RED Fit App soll **iPhone/iOS, Android, Windows und Web** unterstützen, mit konsistentem Aussehen und einer gemeinsamen Fachlogik.
- RED Fit bleibt ein **privates GitHub-Repository**. Das heißt nicht, dass Drittanbieter-Lizenzpflichten entfallen.
- **RED-Morph** ist Referenz für Stil, UI, Komponenten und Motion, **BBT-Bit** für native iPhone-UX und Testdisziplin. Die Musikfunktionen von BBT-Bit sind KEIN Bestandteil von RED Fit.
- Fortschritt dokumentieren, damit **andere Chats sofort** weiterarbeiten können: [[09-CHAT-HANDOFF]].
- Der Projektinhaber hat am 2026-11-08 für die laufende Arbeit explizit Git-Pushes **direkt auf `main`** angeordnet. Keine stillen destruktiven Änderungen.

## Bedienerlebnis
Eine RED Fit Navigation und ein Datenbestand für Training, Pläne, Live-Workouts, Übungsbibliothek, Essen, Ziele, Körperdaten, Fortschritt, Planen/Einkaufen, Backup und Einstellungen. Offline zuerst, kein Pflichtkonto; spätere Synchronisation optional und gesondert designt.

## Nicht-Ziele
- Drei Apps bloß in einem Launcher nebeneinander starten.
- Flutter-, Django-, openGym-Backend- und React-Anwendungen ungeprüft als monolithisches Build zusammenpacken.
- BBT-Bit-Musikengine, Musikstreaming oder RED-Morph-Demo-Galerien in RED Fit einbauen.
- Nicht lizenzierte Gym-visual-Animationen übernehmen.
- Ein fertiges IPA/APK/MSI behaupten, bevor diese tatsächlich gebaut und getestet wurden.
