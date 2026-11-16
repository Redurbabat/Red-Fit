# Agent 05 — openGym Windows / Android / QA — Ausführung 09.11.2026

**Branch:** `agent/redfit-05-windows-quality` (anfänglich 13 Commits hinter `main`, 0 eigene Commits; ohne Force-Push fast-forward auf `0154d7b58e5b73574a82b5bd86cd03a6756abcb2`). Keine anderen Agent-Branches verändert, kein Merge nach `main`.

## Durchgeführte Änderungen

1. `tools/opengym-qa/verify.mjs`: reproduzierbare Prüfung ausschliesslich der **Original-openGym-App**; `npm ci`, Original-`npm run test` und Original-`npm run build` mit getrennten Logs, JSON-Status und Exit-Codes. Legacy-Root-`src/` wird nicht geprüft.
2. `tools/opengym-qa/verify.test.mjs`: vier isolierte Regressionstests für Pfadwahrheit, Befehlsfolge, Weiterlauf nach Testfehler und Abbruch nach Installationsfehler.
3. `.github/workflows/opengym-original-qa.yml`: PR-/manuell ausgelöster Original-App-Check mit Node 22 und kurzlebigen Diagnoseartefakten. Kein Publish/Deploy-Schritt.
4. `docs/05-OPENGYM-WINDOWS-ANDROID-QA.md`: Code- und GitHub-Audit, Originalversionen, CI-Blocker, privater Repo-Status, iPhone-zuerst-Windows-/Android-Gates und Agent-Integrationskonflikte.

## Tatsächliche Prüfungen

- **Erfolgreich (lokal, Linux, Node.js v22.16.0):** `node --check` für beide neuen QA-Dateien. `node --test tools/opengym-qa/verify.test.mjs`: **4/4 bestanden**, 0 übersprungen. Der Test nutzte einen **Fake-npm-Prozess und temporäre Fixture-Dateien** — dieser Erfolg belegt nur die Funktionsweise des QA-Runners, nicht das Bestehen der Original-App.
- **Per GitHub ausgelesen:** Repository `visibility=private`; Original-`frontend/package.json`/Lockfile, `vite.config.js`, Original-`.github/workflows/test.yml`, Root-Workflows, Android-Gradle/Manifest und originale API-/Backup-Codepfade. Root-Cloudflare-Workflow hat nur `workflow_dispatch`; externe Cloudflare-Konfiguration ist unbestätigt.
- **CI-Fehler inventarisiert:** Run `42699825846` (`main`, 09.11.2026, 21:09 UTC) **failure**, `verify` und `offline-regressions` ohne abrufbare Steps; Job-Logs 404. Die genaue Ursache bleibt ungeklärt; **keine Aussage über einen echten npm-/Vite-Fehler** möglich.
- **Nicht ausgeführt:** echtes `npm ci`/Vitest/Vite auf dem vollständigen Originalprojekt, Node-API-End-to-End, macOS/Xcode/iPhone-Simulator/IPA, Android APK, Windows Installer/Realgeräte. Keine öffentlichen Deploys durchgeführt.

## Commitverlauf des Agenten

- `fb251db394f83ae9e5cd3d3ee19d6f0d99041e4c` — Original-Frontend-QA Runner.
- `66ca3c75df437ec403f415c1081773a186a80289` — Fixture-Regressionstests.
- `31c82118facd42bef6653dacd219bc00faeca0e4` — PR-/Manual-QA Workflow.
- `b14d957c0c8fd803ed6b2eea0e30950348ea29ef` — Audit- und Plattform-Gate-Dokument.

## Blocker / nächster Schritt

Vor einem Release **echte Original-App-Tests** auf einem vollständigen Checkout mit funktionierendem Node-/npm-Netzzugang sowie ein echter iPhone-Build/IPA-Nachweis durch Agent 04. Der bislang fehlerhafte GitHub-Actions-Runner benötigt eine separate Account-/Actions-Konfigurationsprüfung. Windows-Shell wird erst nach API-/Backup-/Persistenzkompatibilitätsnachweis aufgebaut; Android bleibt nachrangig. Geplante Integration nur über **diesen einen** Agent-PR in `main`; **kein Selbst-Merge**.

## PR und CI-Nachtrag

- PR gegen `main` tatsächlich eröffnet: **#14** — `https://github.com/Redurbabat/Red-Fit/pull/14` (offen, nicht gemergt).
- Neuer GitHub-Actions-Run **42701819591** für `Original openGym frontend QA` wurde als **failure** zurückgemeldet; der Job `original-frontend` hat **keine abrufbaren Schritte** (`steps: null`). Dies ist **kein** Nachweis, dass der QA-Runner oder die Original-App-Tests begonnen haben. Nach wie vor zuerst Actions-/Runner-Zuteilung prüfen.

## Fortsetzung — QA-Harness Windows-Kompatibilität

- **Noch offener Punkt bearbeitet:** Die bisherigen Fixture-Tests übersprangen ihre wichtigsten Fälle auf Windows, obwohl Agent 05 Windows QA betreut. Der Test-Mock startet jetzt plattformneutral über `process.execPath` und einen separaten Argumentpräfix. Der QA-Runner aktiviert eine Shell auf Windows nur noch für `.cmd`-/`.bat`-Wrapper; direkt ausgeführte Node-`.exe`-Programme erhalten keine unnötige Shell.
- **Neue Regressionstests:** `--skip-install` wird tatsächlich übersprungen und korrekt protokolliert; ein fehlendes npm-Executable wird mit Fehlerstatus statt falschem Erfolg ausgewiesen.
- **Tatsächlich ausgeführt (lokal):** Node.js **v22.16.0**, Linux: `node --check tools/opengym-qa/verify.mjs`, `node --check tools/opengym-qa/verify.test.mjs`, `node --test tools/opengym-qa/verify.test.mjs` → **6/6 Tests bestanden, 0 übersprungen, 0 fehlgeschlagen.** Die Tests verwenden ein synthetisches Original-Frontend-Fixture und einen `fake-npm`-Prozess. **Keine reale Windows-Ausführung, keine echten npm-Installations-/Original-Vitest-/Vite-Builds behauptet.**
- Commits: `7bcef910c4fedad6eac8fb7f1bb13e4ed4476185` (Runner) und `57914039f04f177235f57de1bdf9352caf49cdea` (Tests).
- **Nächster Test-Gate:** Diese sechs Fixture-Tests auf echtem Windows ausführen und danach original `vendor/opengym-upstream/frontend` via `node tools/opengym-qa/verify.mjs` bauen, sobald kompletter Checkout / npm und Actions-Runner verfügbar sind. iPhone-Priorität und Agent-04-Dateihoheit bleiben unberührt.

- **Remote-Nachprüfung nach den Änderungen:** GitHub-Actions-Run `42702745097` (Original-Frontend-QA) und Root-CI-Run `42702745076` meldeten weiterhin `failure`. Der ursprüngliche QA-Job `original-frontend` und beide Root-Jobs hatten `steps: null`; das neue Skript wurde dadurch **nicht nachweisbar auf einem GitHub-Runner ausgeführt**. Erforderlich ist die Prüfung der Actions-/Runner-Konfiguration oder die lokale Ausführung auf einem vollständigen Rechner-Checkout.

## Fortsetzung — Mobile-Vite-Build als iPhone-Qualitäts-Gate

**Neu geprüft und umgesetzt:**
- `tools/opengym-qa/mobile-web.mjs`: prüft erzeugtes Original-`frontend/dist` auf den mobilen `opengym-flavor`-Marker, Vite-JS/CSS-Referenzen und einen vorhandenen ungestempelten Service Worker.
- `tools/opengym-qa/verify.mjs`: führt nach Original-`npm ci`, Vitest und normalem Vite-Build einen zusätzlichen, unabhängigen **`VITE_MOBILE=1 npm run build`** aus. Dieser Build führt bewusst **kein `cap sync`** und kein Media-Staging aus: Agent 04 behält iOS-/Capacitor-Dateihoheit. Fehlender Marker trotz `npm`-Exitcode 0 wird im JSON-Report ausdrücklich als Fehler dokumentiert.
- `tools/opengym-qa/verify.test.mjs`: zwei zusätzliche Tests für falsche mobile Web-Variante und kaputte Bundle-Assets; bestehende Tests an vier originale QA-Stufen angepasst.

**Tatsächlich ausgeführte Prüfung im lokalen isolierten Node-22.16.0-Linux-Verzeichnis:** `node --check` für alle drei QA-Dateien und `node --test tools/opengym-qa/verify.test.mjs` → **8/8 Tests bestanden, 0 fehlgeschlagen, 0 übersprungen**. Es handelt sich um synthetische `frontend`-Fixtures und Fake-npm; weder echte Vite-/Vitest-Pakete noch Native-Builds wurden hier ausgeführt. `mobile-web-build.log` und der Schrittstatus werden in `artifacts/opengym-qa/report.json` erfasst.

**Commits:** `28c357953d1f155ae1a17e312112ab019d944e93` (Mobile-Bundle-Gate), `b87e0be37867c4c50fc616d994614490a3581ab8` (QA-Runner), `bc5ede46e9c990be677b4374eb9c5cd379efbdc1` (Tests), `8158cdc1d79187e5f23877b304bb91ddfe2b86e6` (QA-Doku).

**Offen:** echten Original-`npm ci`-, Vitest- und Web-/Mobile-Build durchführen; GitHub-Actions-Runner-Beschränkung separat prüfen. Erst danach native iPhone-IPA-Abnahme durch Agent 04; Android/Windows nachrangig.

## Fortsetzung — read-only iOS-Xcode-Baseline-Gate

**Geprüfte Lücke:** Bisher wurde die für das iPhone gebaute Web-Variante geprüft, aber nicht, ob originale native Workout-/Health-/Widget-Dateien im vollständigen Xcode-Projekt vorhanden bleiben. Die neue Prüfung verändert weder `frontend/ios/**` noch `capacitor.config.json`, die Agent 04 besitzt.

- `tools/opengym-qa/ios-baseline.mjs`: prüft statisch 13 originale iOS-Projektbestandteile (Xcode-Projekt, Workspace, Podfile, Entitlements, Privacy Manifest, AppDelegate, Info.plist, AppleHealthPlugin, PhoneWorkoutPlugin, LiveActivityPlugin, Assets, Widgets und UITests). Dazu `capacitor.config.json`: gültige App-ID/App-Name und `webDir=dist`. Original-Identifier/-Name werden nur als **Warnung** ausgewiesen, nicht eigenmächtig geändert.
- `tools/opengym-qa/ios-baseline.test.mjs`: fünf neue reine Node-Fixture-Tests für Original-Identität mit Warnungen, RED-Fit-Branding, fehlendes Health-Modul, falsches webDir sowie kaputtes JSON/Bundle-ID.
- `.github/workflows/opengym-original-qa.yml`: führt die fünf neuen Tests und den statischen Audit vor npm-Install aus, falls ein GitHub-Runner verfügbar wird. Kein Xcode-/Apple-Signing-Aufruf und kein Deploy.

**Tatsächlich lokal ausgeführt (Linux, Node 22.16.0):**
`node --check tools/opengym-qa/ios-baseline.mjs`, `node --check tools/opengym-qa/ios-baseline.test.mjs`, `node --test tools/opengym-qa/*.test.mjs` → **13/13 Selftests bestanden, 0 Fehler, 0 Skip**. Die iOS-Tests nutzen künstliche Verzeichnis-Fixtures, keine echte Xcode-Kompilierung.

**SHA-/Herkunftsnachweis:** Die zwei neuen lokal ausgeführten iOS-Test-/Quelltextdateien stimmen mit ihren im Agent-05-Branch gespeicherten Git-Blobs überein: `7fab99494b0024436083b9360c5f873a71b9570e` und `0bdd045f396e9ee15404d6f016ea09875b28de6a`. Der alte achtteilige Fixture-Teststand wurde zuvor ebenfalls auf Node 22.16.0 lokal erneut ausgeführt.

**Zusätzlich via privater GitHub-Verzeichnisabfrage auf `main` geprüft:** 14/14 erwartete originale iOS-Projektdateien/-verzeichnisse in `ios/App`, `ios/App/App` und `ios/App/App.xcodeproj` sichtbar, keine in dieser Auswahl fehlend. `capacitor.config.json`: aktuell `appName=openGym`, `appId=ch.duartesantos.opengym`, `webDir=dist`. Das bestätigt die **Quellstruktur**, nicht Gerätefunktion oder signierte IPA.

**Commits:** `c1779122265825f4bb47f77d33fcb6a149bd92bd` (Prüfer), `e3b2c8fe71342e855b2192af80c3f2eaa7bc85ae` (Tests), `0b60722e8f17550bab5328c6f49a3148adcb601e` (CI-Gate).

**Offen:** Echter npm-/Vite-/Vitest-Build, originales `build:mobile` mit Capacitor-Sync, Xcode/iPhone-Tests und IPA. Für Automatisierung muss der GitHub-Actions-Runner tatsächlich mit ausführbaren Job-Schritten starten. Windows/Android bleiben nachrangig.
