# Agent 02 — RED Morph direkt im Original-openGym-UI

Stand: 2026-11-09  
Branch: `agent/redfit-02-red-morph-ui`  
PR: [#11](https://github.com/Redurbabat/Red-Fit/pull/11) (vorhandener Draft-PR; **nicht mergen**)

## Verbindliche Grundlage und Abgrenzung

Die Eigentümerentscheidung [OPEN-GYM-IS-RED-FIT](../OPEN-GYM-IS-RED-FIT.md) ist massgeblich: `vendor/opengym-upstream/frontend/` ist die aktive React-/Capacitor-Codebasis, die originale openGym-App wird zu RED Fit. Der ältere UI-Transfer nach Root-`src/` in [02-red-morph-ui.md](02-red-morph-ui.md) ist nur Legacy und **keine Abnahme des neuen openGym-Produkt-UI**.

In dieser Änderung bleiben Native-/Health-/Watch-/Widget-/Workout-/Sync-Code, Datenbank, API, Lizenzen und iPhone-Signing vollständig unverändert. iPhone zuerst, keine Veröffentlichung. Original `LICENSE` und `NOTICE.md` bleiben erhalten; die Lizenzierung der Medien darf nicht aus dem privaten Repository abgeleitet werden.

## Inventar und Designentscheidungen

| Originalcode | Status | Entscheidung |
| --- | --- | --- |
| `frontend/src/components/TabBar.jsx` | REWORK | Die fünf echten Buttons, ihre Navigation, Start-/Resume-Semantik und das Mount-Verhalten bleiben. Dekoratives transformiertes Selektionsmaterial ergänzt. |
| `frontend/src/index.css` | KEEP | Bereits fein abgestimmte iOS/Android-Design-Tokens, Glas-Fallback, 44-px-Ziele und Safe Areas. Nicht pauschal neu stylen. |
| `frontend/src/components/Modals.jsx`, `frontend/src/lib/use-sheet-keyboard.js` | KEEP | Vorhandene Touch-/Keyboard-/Sheet-Logik und Scroll-Restore nicht duplizieren. |
| `frontend/src/views/{Home,Plan,Workout,Stats,Library}.jsx` | KEEP | Bedienbare Original-Bereiche; Workout-Logik nicht verändern. |
| `frontend/src/components/red-fit-dock.css` | NEW | Kleine, scoped RED-Morph-Ergänzung zum bestehenden TabBar ohne zweite AppShell. |
| RED Morph Browser-Experimente, refraction/shaders, SwiftUI-Labs | ARCHIVE / nicht übernehmen | Keine Produktionsrechte aus Lab-Status ableiten; keine GPU-Dauereffekte. |
| DELETE-CANDIDATE | keine | Es ist keine unreferenzierte Originalkomponente bewiesen. |

Referenzen gelesen: `Redurbabat/RED-Morph` AGENTS/AI_START_HERE, `skills/red-morph/SKILL.md`, STYLE/COMPONENT_CONTRACT, RED_MORPH_SYSTEM, UI_LANGUAGE, MOTION, web-design und Touch-Kit; reale `app/src/touch/{navigation,glass,internal,motion}/`-Implementierungen. Es wurde **kein** experimenteller UI-Kit-Runtime-Code blind kopiert und keine neue Abhängigkeit eingeführt.

## Konkret umgesetzt

- `components/TabBar.jsx`: echte Root- und Unterrouten steuern `--rf-dock-index` für vier normale Tabs; die bestehende Start-/Resume-Scheibe behält ihre eigene Darstellung.
- Semantik: `<nav aria-label>` und genau ein `aria-current="page"` auf dem aktiven Button einschliesslich der Workout-Ansicht. Keine falsche ARIA-Tab-Rolle und keine geänderten History-/Router-Events.
- `components/red-fit-dock.css`: geschützte passive Selektionsfläche hinter den bestehenden Tasten, kurzer unterbrechbarer Transform-/Opacity-Wechsel, RTL-Richtung, 44px Mindestziel, sichtbarer Fokus, Press-Feedback; Motion/Transparency/High-Contrast/Forced-Colors-Fallbacks.
- `components/TabBar.red-fit.test.jsx`: echte Route-zu-Index-Abbildung und `aria-current`, Verstecken im Workout und DOM-Stabilität abgedeckt.

## Ausgeführte Prüfungen und offene Abnahme

- GitHub-Code gelesen, Importstruktur und Original-Testmuster abgeglichen; die o.g. Änderungen liegen in den Original-openGym-Dateien auf dem **zugewiesenen** Agentenbranch.
- **NICHT ausgeführt:** `cd vendor/opengym-upstream/frontend && npm ci && npm test -- TabBar && npm run build`, Browser-/Simulator- und iPhone-Realgerätetests; in diesem Kontext steht kein kompletter npm-/Xcode-Checkout bereit. Testdateien sind **nicht** gleich erfolgreich ausgeführten Tests.
- Nachprüfen auf 360/390/430 px, iPhone Safe Areas, RTL, Light/Dark, Reduce Motion/Transparency, Screenreader, grossen Schriftgrössen, Tastatur, High Contrast. Workout starten, Satz speichern, Gerät sperren und fortsetzen, lokale Daten sowie Widget/Watch unverändert bestätigen.
- Integration von aktuellem `main` mit der neuen iPhone-vorrangigen Eigentümerentscheidung erfolgt im Branch ohne Reset/Force-Push; Build/QA vor PR-Merge bleibt offen.

## Nächster Schritt

Vollständigen Frontend-Build + Vitest im echten Checkout ausführen und Diff von PR #11 prüfen; anschliessend eine gezielte iPhone-UI-Sichtung mit Agent 04 abstimmen. **Keine Selbst-Merges, kein öffentliches Deploy.**

## CI-Signal (GitHub Actions)

GitHub Actions hat für Commit `4d09068b21b1fc2b7e67ad53b6d9f27f32b9dd4d` den Run [42701986109](https://github.com/Redurbabat/Red-Fit/actions/runs/42701986109) ausgelöst: **failure** (Jobs `verify` und `offline-regressions`). Die Job-API lieferte **keine Step-Einträge** und der Abruf beider Job-Logs scheiterte mit `404 BlobNotFound`; eine konkrete Fehlerursache ist damit **nicht belegt**. Nicht als Testbestehen werten. Wichtig: Das vorhandene `.github/workflows/ci.yml` führt nur die Root-Tests aus und enthält **keinen Schritt für** `vendor/opengym-upstream/frontend/`; Agent 05 soll die Original-openGym-Test-/Buildpipeline ergänzen (separate Dateihoheit).

## Korrektur des Desktop-Dock-Gitters (Fortsetzung)

Das originale `index.css` setzt das Full-Width-Dock auf iPhone/Tablet mit **6px** Inline-Padding, ab `min-width: 1000px` jedoch als **520px**-Kapsel mit **10px** Inline-Padding um. Die erste RED-Morph-Auswahlfläche hatte fest 6px / `calc((100% - 12px) / 5)` und konnte deshalb im Desktop-Dock seitlich vom zugehörigen Button abweichen.

**Behoben:** `red-fit-dock.css` nutzt jetzt `--rf-dock-gutter` mit 6px bzw. 10px am Original-Breakpoint; `inset-inline-start` und `width` verwenden dieselbe Variable. `red-fit-dock.styles.test.js` enthält zwei zusätzliche Vitest-Vertragstests (noch nicht ausgeführt).

**Tatsächlich lokal geprüft:** Der alte CSS-Blob wurde bytegleich zum GitHub-Blob verifiziert (`a75bd2ddf34f2d107d31be21251c0b0721b116cc`). Das korrigierte Stylesheet wurde mit **PostCSS** erfolgreich geparst. Ein mit Node 22.16 ausgeführter statischer Geometrie-Check prüfte 320, 360, 390, 430, 999, 1000 und 1280px und die Positionen 0, 1, 3, 4 (alle OK). **Keine** Pixel-/Screenshot-, Browser-/WebKit-, vollständigen Vitest- oder iPhone-Buildtests; die Geometrieprüfung arbeitet mit der im Original vorgesehenen Fünf-Spalten-Annahme. Relevanter CI-Befund: auch frühere `main`-Runs scheitern, nicht nur der Agenten-Branch; ohne Joblogs keine Ursachenbehauptung.

## Home-Ansicht: Markenname und Kalender-Barrierefreiheit (Fortsetzung)

Im tatsächlichen `frontend/src/views/Home.jsx` wurde noch die sichtbare Gast-Überschrift `openGym` verwendet, obwohl die ursprüngliche App nun RED Fit heisst. Sie wurde **gezielt auf `RED Fit` korrigiert**; die personalisierte Begrüssung `t('Hi {0}', user.name)` bleibt unverändert. Der ursprüngliche 7-Tage-Kalender besteht bereits aus fokussierbaren `tappable()`-Zeilen; diese haben jetzt ein vollständiges **lokal formatiertes Datums-Label** und `aria-current="date"` nur am heutigen Tag. Der Day-Override-Handler und sämtliche Fachlogik bleiben erhalten.

Dateien: `frontend/src/views/Home.jsx`, `frontend/src/views/Home.red-fit-a11y.test.js`. Die neuen zwei Vitest-Quellverträge sind **nicht in Vitest ausgeführt**; sie verhindern aber künftig als Regressionstests eine erneute Beschriftung mit `openGym` und den Verlust der Kalender-Semantik. GitHub-Quellprüfung nach Commit ist kein Laufzeittest. Native iPhone-VoiceOver-Prüfung und produktionsnaher Build bleiben offen.
