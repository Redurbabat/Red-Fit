# RED Fit – unabhängiger Offline-Regressionslauf

**Stand:** 8. November 2026 · Integrations-Branch
`feat/unified-iphone-windows-integration`

## Problem und Lösung

Der bestehende `.github/workflows/ci.yml`-Job `verify` beginnt mit
`npm ci`. Kann die npm-Registry nicht erreicht werden oder ist die
Runner-Umgebung gestört, gelangen viele bereits vorhandene,
dependency-freie Regressionstests nicht zur Ausführung.

Das neue `tools/offline-regressions.mjs` entdeckt automatisch **alle
`tools/*.selftest.mjs`** im Checkout und startet sie in einem eigenen
Node.js-Testlauf:

```bash
# Node.js 22+, kein npm ci / node_modules / Netzwerk erforderlich
node tools/offline-regressions.mjs --list
node tools/offline-regressions.mjs
# alternativ npm run test:offline (npm CLI, aber keine Paketinstallation)
```

Der Testlauf enthält aktuell **19 Suites** inklusive fünf
Selbsttests des Offline-Runners. Es werden ausdrücklich **keine**
`playwright-core`-/Vitest-/Dexie-Pakete installiert. Node startet die
Dateien mit `--experimental-strip-types --test --test-concurrency=4`,
wodurch die importierten rein funktionalen TypeScript-Module verarbeitet
werden können. Fehler führen zu einem **nichtnull Exit-Code**; auch ein
leerer Testordner ist ein Fehler. Neue `*.selftest.mjs`-Dateien werden
ohne separate Pflege der CI-Workflow-Liste erfasst.

`.github/workflows/ci.yml` besitzt dafür einen eigenständigen Job
`offline-regressions` mit Checkout und Node-22-Setup, **ohne
`npm ci`**. Der bisherige vollständige `verify`-Job bleibt
unverändert als erforderlicher Release-Nachweis (Installation,
TypeScript, ESLint, Vitest, Vite-Build); die zwei Icon-Suiten müssen
im `verify`-Job nicht nochmals separat gestartet werden.

## Tatsächlich ausgeführte Checks

- **5/5 Tests des neuen Test-Starters bestanden** auf Node.js 22.16.0:
  sortierte Erkennung, erfolgreicher Lauf, korrekte Fehlerweitergabe,
  leerer Testbestand, ungültige Optionen. Beim ersten Probelauf wurde
  ein Fehler in verschachtelten Node-Testprozessen entdeckt und durch
  Entfernen der internen `NODE_TEST_CONTEXT`-Vererbung behoben.
- Eine **lokal zusammengestellte Prüfumgebung** aus den bereits
  verifizierten Integrationsmodulen wurde mit dem neuen Runner
  gestartet: **15 der 19 Repository-Suites**, **113/113 Tests bestanden**
  in einem gemeinsamen Node-Testlauf. Die vier im lokalen
  Ausschnitt nicht vorhandenen Suiten wurden **nicht** mitgezählt:
  `backup-snapshot`, `backup-workout-revision`,
  `bundled-wger` und `cooking-yield`.
- Die beiden neuen Runner-Dateien wurden über ihre vollständigen
  Git-Blob-IDs bytegenau gegen GitHub verifiziert:
  - `tools/offline-regressions.mjs`:
    `1d06534ccfe6c3d48904e9768e8b1ca77dc922d3`;
  - `tools/offline-regressions.selftest.mjs`:
    `1436da5cc18cac3f72779e5f27d9057ad1692c41`.

Beim ersten kombinierten Lauf waren zwei **lokale Fixture-Importpfade**
falsch, da die Foto-Tests aus ihren ursprünglichen Arbeitsordnern
kopiert wurden. Nach Anpassung dieser *lokalen Kopien* verlief der
15-Suiten-Lauf mit 113/113 bestandenen Prüfungen. Im GitHub-Branch
verweisen die beiden Originaltests bereits auf
`../src/services/backup/` und wurden **nicht geändert**.

**Nicht behauptet:** Ein vollständiger 19-Suiten-Lauf im echten
Repository-Checkout, ein grüner GitHub-Actions-Lauf oder ein kompletter
TypeScript-/Vitest-/Dexie-/Browser-/iOS-/Windows-Build. Die Registry
bleibt im lokalen Container nicht auflösbar (`EAI_AGAIN`); GitHub
Actions stellte zuletzt keine Runner zu (siehe
[CI-RECOVERY.md](CI-RECOVERY.md)). Dieser separate Job kann ebenfalls
erst bei einer funktionierenden Runner-Zuteilung gestartet werden.

## Freigabekriterien

Der neue Offline-Job muss in CI vollständig grün sein **und** der
unverändert bestehende `verify`-Job mit
`npm ci → typecheck → lint → test → build` muss erfolgreich laufen.
Danach bleiben echte Capacitor-/Xcode- sowie Tauri-/Windows-Builds
und Geräte-/Datenschutzprüfungen notwendig. Das Bestehen von
Node-Selbsttests ist **kein** Nachweis für ein funktionsfähiges
Native-Release.
