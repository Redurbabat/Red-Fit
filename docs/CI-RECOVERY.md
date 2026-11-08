# GitHub Actions: CI-Wiederherstellung und lokaler Prüfpfad

## Gesicherter Befund (2026-11-08)

GitHub Actions hat die vorhandene Workflow-Datei
`.github/workflows/ci.yml` angenommen und einen `verify`-Job erzeugt.
Der Job scheitert jedoch **vor der Ausführung jedes Schrittes**.

| Zweig | Run-ID | Zeitpunkt | `runner_id` | `steps` | Status |
|---|---:|---|---:|---|---|
| main | 31279607335 | 2026-08-08 | 0 | [] | failure |
| main | 31305956683 | 2026-08-09 | 0 | [] | failure |
| Integration | 42434302867 | 2026-11-08 | 0 | [] | failure |

Diese Störung existierte auf `main` bereits **vor** der Integration der drei
Projektquellen. Die Jobs liefen nur etwa 1–2 Sekunden. Das belegt **keinen**
TypeScript-, Lint-, Vitest- oder Build-Fehler; diese Schritte wurden nicht
gestartet. Die Ursache ist aus dem GitHub-Connector noch nicht bestimmbar.

### Externe Konfigurationsprüfung durch den Repository-Eigentümer

Die Run-Detailseite öffnen:
`https://github.com/Redurbabat/Red-Fit/actions/runs/42434302867`.

1. Hinweise unmittelbar über dem `verify`-Job lesen (z. B. Kontingent,
   Zahlungen, deaktivierte Actions oder Runner-Beschränkungen).
2. Repository **Settings → Actions → General**:
   Actions- und Runner-Berechtigungen prüfen.
3. GitHub-Konto oder Organisation: **Billing and licensing → Actions**:
   verfügbare Minuten, Budget- oder Kontobeschränkungen prüfen.
4. Erst nach Behebung der Ursache einen neuen Workflow-Run ausführen.

**Kein automatisches Umstellen auf selbstgehostete Runner oder Entfernen der
CI-Gates**: Das würde die Sicherheits- und Qualitätsanforderungen umgehen.

## Lokaler Prüfersatz (Windows, macOS und Linux)

Voraussetzungen: Node.js und npm; ein lokaler Checkout des Branches
`feat/unified-iphone-windows-integration`.

Im Repository-Verzeichnis:

```bash
node tools/verify-local.mjs
```

Der Befehl führt nacheinander aus:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

Bei einer Wiederholung mit bereits **korrekt installierten** Abhängigkeiten:

```bash
node tools/verify-local.mjs --skip-install
```

Das Skript beendet den Lauf beim ersten Fehler mit dem zurückgegebenen
Exit-Code. Der Bericht `artifacts/verify-local.json` enthält nur Status,
Schrittnamen, Laufzeiten, Exit-Codes und Node-/Plattformversion (keine
Trainingsdaten). `artifacts/` steht in `.gitignore` und wird nicht committed.

### Regressionstest des lokalen Prüfskripts

```bash
node --test tools/verify-local.selftest.mjs
```

Am 2026-11-08 in einer isolierten Linux-Fixture durchgeführt:
**3/3 Tests bestanden** (grüner Durchlauf, bewusst fehlschlagender Testschritt
mit Abbruch, ungültiger CLI-Parameter). Die npm-Prozesse waren dabei
ausdrücklich **Mocks**. Dieser Test bestätigt ausschließlich die
Prüfsteuerung, **nicht** den tatsächlichen RED-Fit-App-Build.

## Zusätzlicher Offline-Test-Job (8. November 2026)

Der Integrations-Branch enthält jetzt in
`.github/workflows/ci.yml` den unabhängigen Job
`offline-regressions`. Dieser Job führt mit Node.js 22 alle
`tools/*.selftest.mjs` **ohne `npm ci`** aus und liefert einen
eigenständigen Qualitätsstatus. Der reguläre `verify`-Job bleibt
für `typecheck`, `lint`, Vitest und Build notwendig.

**Lokal verifiziert:** Nach Ergänzung der zuvor fehlenden
Originaldateien aus dem privaten Branch wurden zunächst 19 Offline-Suiten
mit 144/144 bestandenen Tests ausgeführt. **Nach der Route-Switch-Korrektur
waren es 20/20 Suiten und 154/154 Tests; nach der Note-Writer-
Korrektur sind es 21/21 Suiten und 166/166 bestandene Tests**
auf Node.js 22.16.0.
Die relevanten Test- und Quelldateien stimmen per Git-Blob-SHA-1
mit GitHub überein. Der Lauf erfolgte in einer lokal rekonstruierten
Prüfumgebung (kein direkter Git-Checkout).

**Noch nicht verifiziert:** ein echter GitHub-Actions-Run, die vollständige
npm-/Dexie-/React-Suite und die nativen Builds. Ohne Runner-Zuteilung
startet auch der neue Offline-Job nicht. Details und genauer Umfang:
[OFFLINE-REGRESSION-GATE.md](OFFLINE-REGRESSION-GATE.md).

## Freigabekriterium

Der Draft-PR bleibt unmerged, bis mindestens ein vollständiger RED-Fit-Lauf
(`typecheck`, `lint`, `test`, `build`) erfolgreich und nachvollziehbar
durchgeführt wurde. Anschließend sind reale iOS- und Windows-Builds separat
erforderlich.
