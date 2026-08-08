# RED Fit 2031 — Privacy

## Grundsätze

- **Local-first, private by default.** Alle Daten in IndexedDB auf dem Gerät.
  Kein Konto, kein Backend, keine Cloud-Pflicht.
- **Keine Telemetrie.** Performance-Diagnostik bleibt lokal. Falls je
  Telemetrie: explizit Opt-in, dokumentiert.
- **Export jederzeit.** Backup ist lesbares, versioniertes JSON ohne Konto.

## Datenklassifizierung

| Klasse | Beispiele | Regeln |
|---|---|---|
| normal | Übungen, Pläne, Foods, Einkauf | Standard |
| health | Workouts, Mahlzeiten, Gewicht, Maße, Recovery | nie an Dritte; externe Anfragen (z. B. Open Food Facts) senden nur die Suchanfrage/Barcode, nie Nutzerdaten |
| sensitiveMedia | Fortschrittsfotos (Phase C) | nie in Analytics/AI/Cloud ohne explizite Freigabe; Backup-Export nur auf ausdrückliche Auswahl („Daten + Fotos") |

## Readiness ist keine Medizin

Recovery/Readiness sind Trainings-Unterstützung — keine medizinische
Diagnose, keine Krankheits- oder Verletzungsprognose. UI-Texte bleiben
entsprechend formuliert.

## KI (Phase D)

AI-Gateway mit Scopes (training.read, nutrition.read, body.read,
recovery.read, photos.read). Default für photos.read: **deny**. Vor jeder
Anfrage wird sichtbar, welche Daten verwendet werden. KI schreibt nie ohne
Preview + Bestätigung.

## Import-Sicherheit (umgesetzt)

Zod-Validierung, `__proto__`/constructor/prototype-Ablehnung, Größenlimit,
Vorschau, Merge in einer Transaktion, Invarianten-Normalisierung — nie ein
halb eingespielter Zustand, nie ungefragtes Löschen.
