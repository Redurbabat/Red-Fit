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

## iPhone-Minimum-Touch-Area – Wochenpfeile

Bei einem Quellcode-Audit der Original-openGym-Startseite wurde eine reale Zielgrössenlücke festgestellt: die beiden Kalenderpfeile hatten **30 × 30 CSS-px**; die vorhandene `.iconbtn::before`-Erweiterung in `frontend/src/index.css` reicht mit je 6px pro Seite nur auf **42 × 42 CSS-px**. Beide Pfeile wurden auf **32 × 32 CSS-px** erhöht und erreichen damit rechnerisch **44 × 44 CSS-px**, ohne den Kalender-Handler, die Position im Original-React-Baum oder die iPhone-Safe-Areas zu verändern. Die vorhandenen deutschen/übersetzbaren `Previous week`- und `Next week`-Aria-Labels bleiben erhalten.

In `frontend/src/views/Home.red-fit-a11y.test.js` wurde ein dritter Vitest-Regressionstest ergänzt, der **beide Pfeile** und die tatsächlich vorhandene Hit-Area-Erweiterung im Original-CSS berücksichtigt. Das ist eine Code-/Geometrie-Vertragsprüfung, kein reales Pointer- oder VoiceOver-Gerätetest. Für die laufenden GitHub-Runner sind weiterhin keine ausführbaren Schritte/Logs verfügbar; Vitest/Vite und iPhone-Tests sind **nicht ausgeführt**.

### Regressionstest-Korrektur

Die neu ergänzte Regex in `Home.red-fit-a11y.test.js` hat zunächst `-6` statt `6` als Vergrösserungsbetrag erfasst. Sie wurde so korrigiert, dass das Minuszeichen **ausserhalb der Capture-Gruppe** liegt: `inset: -6px` liefert den Betrag `6`. Die tatsächliche CSS- und React-Quellzeichenfolge wurde per ausführbarer JavaScript-RegEx-Prüfung überprüft: beide Wochepfeile ergeben 32 + 2×6 = 44 CSS-px. Diese Prüfung ist ein lokaler Vertragscheck, **kein ausgeführter Vitest- oder WebKit-Gerätetest**.

## Originales Dock-Routing mit Node geprüft (Fortsetzung)

Die existierende Routen-/Eltern-Tab-Berechnung von `TabBar.jsx` wurde **ohne funktionale Änderung** in `frontend/src/components/red-fit-dock-route.js` ausgelagert. Die Komponente verwendet weiterhin `cur`, `parent`, `activeIndex` und unveränderte Navigation/Start-Handler. Es gibt keine React-, Training-, Backend-, iOS- oder neue Paketabhängigkeit in diesem Helfer.

**Lokal tatsächlich ausgeführt (Node 22):** `node scripts/check-red-fit-dock-route.mjs` – 19/19 echte Quell-Funktionsfälle bestanden, darunter alle fünf Tabs, Unterseiten, Workout-Ausblendung und `/muscles` mit Herkunft aus Stats vs. Library. Ein separater temporärer Vorher-/Nachher-Paritätscheck der alten Originalberechnung und der ausgelagerten Funktion bestand für 160/160 Route/State-Kombinationen. Die mit GitHub abgeglichenen Git-Blob-SHAs bestätigen identischen Test-/Helper-Code. Der temporäre Paritätscheck wurde nicht eingecheckt; das eigenständige Node-Regression-Script hingegen schon.

Der vorhandene Vitest-Integrationstest `TabBar.red-fit.test.jsx` deckt nun auch die tatsächliche React-Auswahl für `/muscles` mit beiden Herkunftszuständen ab. **Vitest selbst, vollständiger Vite-Build und native iPhone-Tests wurden nicht ausgeführt**; deshalb bleibt PR #11 Draft. Das bestehende GitHub Actions-CI schlägt auch auf `main` fehl und enthält keinen Original-openGym-Frontend-Testlauf. Runner-/CI-Konfiguration gehört Agent 05.

## LTR/RTL CSS-Layout-Vertrag (Fortsetzung)

Hinzugefügt: `frontend/scripts/check-red-fit-dock-layout.mjs` ohne externe Abhängigkeiten. Der Test liest die echte `src/components/red-fit-dock.css` und prüft **10 CSS-Verträge** (Mobile/Desktop-Padding, fünf gleiche Spalten, logischer Inline-Start, Bewegungsrichtung in RTL/LTR, passive Auswahl, Ausblenden bei Workout, Reduce Motion, sichtbarer Fokus). Die Auswahlkoordinaten werden für acht Viewportbreiten (320, 360, 390, 430, 768, 999, 1000, 1280px), zwei Sprachrichtungen und vier normale Tabs berechnet: **64/64 Quell-/Geometriefälle bestanden**.

**Tatsächlich mit Node 22.16.0 ausgeführt:** `node scripts/check-red-fit-dock-layout.mjs` gegen byteidentische `red-fit-dock.css` (Git-Blob SHA `5f7fc9f1767088adc1b09a177397ebfd3a3281b2`). Das ist **kein** Browser-CSSOM-/WebKit-/iPhone-Nachweis. Ein Browser-Geometrietest in Chromium wurde versucht, endete aber mit Timeout und ist **nicht bestanden**. Es wurden keine App-Styling-, Trainings- oder iOS-Dateien verändert. Die vollständige Vitest-/Vite-/iPhone-Abnahme bleibt offen.

## Unterseiten des Coach/Administrationsbereichs (Fortsetzung)

Die originale `App.jsx` deklariert `/admin`, `/coach/intake` und `/coach/setup` als erreichbare Seiten, rendert dort aber weiterhin die `TabBar`. Im vorherigen RED-Morph-Routenhelfer ergaben alle drei `activeIndex: -1`, weshalb die Orientierung im Dock verschwand. Tatsächliche Navigationsbelege: `Settings.jsx` öffnet `/admin` und `/coach/setup`; `CoachSetup.jsx` geht zurück zu `/settings`; `CoachIntake.jsx` geht zurück zu `/plan`.

**Behoben im Original-Frontend:** `red-fit-dock-route.js` weist `/admin` und `/coach/setup` dem Home-Tab zu, `/coach/intake` dem Plan-Tab. Der Coach-Hauptchat `/coach` bleibt unverändert ohne TabBar (App-Shell blendet sie aus), `/coach/proposal` wird von der App auf den Chat umgeleitet. Trainings-, Coach-, Einstellungs- und Navigations-Handler bleiben unverändert. Ein weiterer `it.each`-Test deckt die drei echten React-Dock-Zuordnungen ab (Vitest **noch nicht ausgeführt**).

**Ausgeführt:** In einem isolierten, exakt versionierten Node-22-Quellabzug von Helfer und Route-Check liefen **24/24** cases erfolgreich, inklusive 5 neuer Randfälle. Die neuen Git-Blob-SHAs wurden nach Commit mit den lokal getesteten Dateien verglichen. Der Node-Lauf ist kein vollständiger Frontend-Build oder native iPhone-Prüfung. Der vollständige Vitest/Vite-Run bleibt offen und GitHub Actions fehlschlagend (Agent 05 verantwortlich).

## Home-Wochentage auf schmalen iPhones: Touch-Ziele (Fortsetzung)

Im originalen `index.css` verwendet `#app` 16px Seiten-Padding, die `.card` 16px Innenabstand und `.week` 4px Lücken. Bei 320px Viewport bleiben **256px** für 7 anklickbare Tage: pro Feld ungefähr **33.1px** (unter dem 44px-Touchziel). Die bestehende `.wday`-Regel hatte keine Mindestbreite. Die bisherige Änderung für die Pfeile allein löste dieses Problem **nicht**.

**Behoben:** Die originale `Home.jsx` importiert jetzt `views/red-fit-home.css`, nutzt `className="week redfit-home-week"` und gibt der Wochenleiste eine per `aria-label={wkLabel}` benannte `role="group"`. Die neue, strikt auf Home begrenzte CSS-Regel setzt für jeden bestehenden `tappable()`-Tag **44px Mindestbreite**, flexibles Auffüllen und horizontales Scrollen mit sanftem Scroll-Snap; die Daten, Kalenderlogik, Sprachrichtung und Handler bleiben unverändert. Der vollständige Kalender braucht mindestens **332px**: ab ungefähr 396px Gerätebreite passen alle Tage ohne Scrollen (bei unveränderten 16px + 16px Seitenabständen), darunter können alle sieben erreicht werden, ohne kleinere Trefferflächen zu erzwingen. Originale Kalender an anderer Stelle bleiben unverändert.

**Lokal ausgeführte Quell-/Rechenprüfung:** `node scripts/check-red-fit-home-week.mjs` mit Node 22.16.0 gegen exakt nachgebaute relevante Original-CSS- und Home-Zeilen sowie den neuen CSS-/Script-Dateien: **10/10 Quell-/CSS-Verträge und 7/7 Breitenberechnungen bestanden**. Dies ist kein Browser-/WebKit-/VoiceOver-Test; der vollständige Original-Frontend-Checkout wurde dabei **nicht** ausgeführt. Die neuen CSS- und Script-Blobs werden nach GitHub-Commit mit ihren lokal getesteten Git-SHAs abgeglichen. Eine weitere Vitest-Vertragsprüfung wurde ergänzt, aber **nicht in Vitest ausgeführt**. Weiter offen: kompletter Vite-/Vitest-Lauf, reales iPhone-Scrolling und Home-/TabBar-Abnahme.

## Fokusrahmen in scrollbarerer Wochenleiste (Fortsetzung)

**Tatsächlicher Chromium-Headless-Browsertest** (Chromium 144, lokal installierter Playwright-Treiber) mit isolierter HTML-Ansicht und byteidentischer neuer `red-fit-home.css`, dazu den aus dem echten `index.css` kopierten Layout-Grundregeln: **7/7 Breiten** (320, 360, 375, 390, 396, 430, 560 CSS-px) zeigten mindestens 44px breite Tage und den erwarteten Scrollbereich. Bei 320px war `clientWidth=256`, `scrollWidth=332`; bei 396px waren beide 332px; bei 430px betrug die kleinste Tagbreite ca. 48.84px.

Der Browsertest deckte einen echten CSS-Fehler auf: Auf dem ersten Wochentag lag der linke Rand unmittelbar an der Scroll-Clipkante, während der globale `:focus-visible`-Rahmen mit positivem `outline-offset: 2px` nach aussen ragte und abgeschnitten wurde. **Behoben:** Die ausschliesslich auf Home-Wochentage begrenzte Regel `.week.redfit-home-week > .wday:focus-visible { outline-offset: -3px; }` verlegt den sichtbaren Fokusrahmen nach innen. Anschliessend im Browser geprüft: 7/7 Layoutbreiten und **4/4 Rand-Fokusfälle** (erster und letzter Tag in LTR/RTL) bestanden; in RTL scrollte der Browser beim Fokus auf den letzten Tag auf `scrollLeft=-76`. Der Originalcode, seine Daten und der Scrollhandler bleiben unverändert.

Die vorhandene Node-Kontraktprüfung `scripts/check-red-fit-home-week.mjs` wurde um die Fokusregel ergänzt und lokal erneut ausgeführt: **11 Quell-/CSS-Verträge und 7 Breitenrechnungen bestanden**. Ein weiterer Vitest-Vertrag wurde hinzugefügt (**noch nicht ausgeführt**). Wichtig: Browserprüfung einer **isolierten HTML/CSS-Testansicht**, keine komplette React-App und keine native iPhone-WebKit-/VoiceOver-Abnahme. Der getestete CSS-Blob wurde vor und nach Commit mit GitHub abgeglichen; vollständiger npm-/Vite-/Vitest-Build und iPhone-QA bleiben offen.

## Vertikaler Dock-Versatz im Browser gefunden und behoben (Fortsetzung)

Die CSS-Auswahlfläche in `red-fit-dock.css` wurde bisher mit `inset-block-start: 2px` positioniert, während die originalen fünf Buttons in `index.css` nach unten ausgerichtet sind (`align-items:flex-end`, mobile `padding-block-end:calc(6px + var(--sab))`, Desktop `padding-block-end:9px`). **Echter Chromium-Headless-Test** mit den Original-Regelblöcken und dem bestehenden RED-Morph-CSS (nicht der vollständigen React-App) ergab eine **vertikale Abweichung von -8px auf Mobilgeräten und -6px ab 1000px Desktopbreite**. Die horizontalen Versätze auf Desktop waren rund 1px durch dessen umlaufenden Hairline-Rahmen.

**Behoben:** `red-fit-dock.css` verankert die passive Auswahl jetzt über `inset-block-end:var(--rf-dock-bottom-space)`: auf dem Smartphone `calc(6px + var(--sab))`, auf Desktop `9px`. Dies übernimmt die tatsächliche Unterkante des vorhandenen Buttons und berücksichtigt iPhone Safe Areas ohne zusätzliche Javascript-Berechnung. Router, Start/Resume, Training und originale Dock-Struktur bleiben unverändert.

**Tatsächlich ausgeführt vor dem Commit:** Chromium 144, Playwright-basierter isolierter HTML/CSS-Test, **144/144** Kombinationen aus 6 Viewportbreiten (320, 390, 430, 999, 1000, 1280px), 2 Schreibrichtungen, 3 Safe-Area-Bottom-Werten (0/24/34px) und 4 normalen Tabs bestanden. Maximaler **vertikaler Fehler 0.00px**, horizontal auf Desktop bis **1.03px** durch Rahmen-/Subpixel-Rundung. Node 22.16.0: `node scripts/check-red-fit-dock-layout.mjs` **64/64 mathematische Layoutfälle und 13/13 CSS-Verträge** bestanden; CSS und Script entsprechen den lokal geprüften Git-Blobs. Vitest-Vertrag zur vertikalen Position ergänzt, aber **noch nicht in Vitest ausgeführt**. Echte React-Vite-, Apple-WebKit- und iPhone-Hardwaretests sowie der vollständige Frontend-Build bleiben ausstehend. Root-GitHub-CI schlägt auch auf `main` fehl (Agent 05).

## CI-Fehler konkret diagnostiziert und übergeben (2026-11-09)

Die GitHub-Actions-Logs des vorherigen `verify`-Jobs (`42711967762`, Job `129483559773`) wurden **tatsächlich ausgelesen**. Anders als bei den älteren Runner-Fehlern liefen nun `npm ci` und `npm run typecheck` erfolgreich. `npm run lint` stoppt bei `src/services/workout/setNotes.ts:10:14` mit ESLint-Regel `no-control-regex`; `npm run test` und `npm run build` waren dadurch **skipped**. Der Originalcode enthält `.replace(/[\\u0000-\\u001f\\u007f]/g, " ")`, um ASCII-Steuerzeichen absichtlich zu entfernen. **Der Blob dieser Legacy-Workout-Datei ist auf `main` und dem Agent-02-Branch identisch** (`7217d9cf9736c03bd7d921ba0a33b4b4b7aa1669`); der Fehler wird nicht von den Dock-Änderungen ausgelöst.

**Tatsächlich erledigt:** Zuständigen Workflow/Dateiquelle geprüft, genaue Job-Logs eingesehen und [Issue #16](https://github.com/Redurbabat/Red-Fit/issues/16) mit Reproduktion, minimalem nichtverhaltensänderndem Lösungsvorschlag und Agenten-Zuständigkeit erstellt. Eine gezielte `eslint-disable-next-line no-control-regex` mit Erklärung wäre möglich, weil das Matchen der Steuerzeichen Absicht ist. **Nicht vorgenommen:** kein Eingriff von Agent 02 in fremde Workout-Dienstdateien, keine Änderungen am CI-Workflow (Agent 05).

**Weiterhin offen:** Blocker durch zuständigen Agenten beheben, danach Root-CI vollständig ausführen. Der Root-Workflow prüft ausserdem **nicht** das Original-openGym-Frontend unter `vendor/opengym-upstream/frontend/`; dessen vollständige Vitest-/Vite-Abnahme und iPhone-WebKit/VoiceOver bleiben separat nötig (Agent 05/04).

## Heute am Ende einer schmalen Woche automatisch zeigen (Fortsetzung)

Nach dem Fix der Touch-Ziele sind auf 320px Bildschirmbreite nur etwa fünf der sieben 44px-Tage sofort sichtbar. Der aktuelle Tag konnte am Ende der Woche daher ausserhalb des sichtbaren Ausschnitts liegen. **Behoben im originalen `views/Home.jsx`:** `useRef` verweist auf die bestehende Wochenleiste; ein `useEffect` bei aktueller Woche (`weekOffset === 0`), deaktiviertem Rotationsmodus und geänderten Tages-/Wochendaten ruft den neuen, unabhängig testbaren Helfer `views/scroll-home-week.js` auf. Er verwendet ausschliesslich horizontale Koordinaten von `getBoundingClientRect()`, verschiebt bei Bedarf `scrollLeft` und verändert weder Seiten-ScrollY noch Tastaturfokus. Bei anderen Wochen und aktivem Coach-Rotationsmodus wird nichts ausgerichtet. Die originalen sieben `tappable()`-Tage und sämtliche Daten-/Trainingsfunktionen bleiben unangetastet.

**Tatsächlich geprüft, vor GitHub-Commit:** `node scripts/check-red-fit-week-reveal.mjs` (7/7 Funktions-/No-op-Szenarien), `node --check` für Helper und Script sowie **Chromium/Playwright in einer isolierten HTML/CSS-Testansicht: 84/84** Kombinationen aus 6 Breiten (320, 360, 390, 396, 430, 560px), LTR/RTL und allen 7 Tagespositionen: Der heutige Tag war danach vollständig im Ausschnitt, `window.scrollY` unverändert, breite Wochen ohne Bewegung. Original-`red-fit-home.css` wurde dabei verwendet. Zwei neue Dateien werden mit ihren lokalen Git-Blob-SHAs `9fc1f94097133eef6a27cdc33649f1fc9a67d0cc` und `ece1bc19f237eea9feb041d457fc32719d5f4a04` abgeglichen. Der zusätzliche Home-Vitest-Quellvertrag wurde **noch nicht** mit Vitest ausgeführt. Dies ist ausdrücklich **kein** vollwertiger React-/WebKit-/iPhone-Test; die komplette Original-Vite-Suite und iPhone-VoiceOver-Abnahme bleiben offen.

## Week-Dot-Status für VoiceOver zugänglich (Fortsetzung)

Bei der Quellenprüfung von `views/Home.jsx` wurde erkannt, dass die sieben ursprünglichen farbigen Kalenderpunkte (`done`, `noted`, `ovr`, `plan`) im `aria-label` nicht erwähnt wurden. Der bisherige Status war nur optisch wahrnehmbar. **Umgesetzt:** `views/home-week-status.js` enthält eine kleine, browserunabhängige Funktion, die die **bisherige Priorität unverändert** hält, aber zusätzlich existierende openGym-Übersetzungsschlüssel liefert: `Completed`, `Note`, `Rescheduled`, `Planned`. Alle vier Schlüssel wurden im vorhandenen `locales/de.js` bestätigt; `i18n-core.js` leitet `de-CH` regulär ab. Die bestehende volle Datumsbeschreibung enthält nun das übersetzte Statuswort. Für Tage ohne Status bleibt sie unverändert. Der visuelle Punkt ist ausdrücklich `aria-hidden="true"`; die `tappable()`-Funktion, Kalenderdaten und Tagesmarkierung `aria-current=date` bleiben unverändert.

**Tatsächlich ausgeführt vor Commit:** `node scripts/check-red-fit-week-status.mjs`: **21/21** reine Funktionsprüfungen bestanden (16 Kombinationen der Statuspriorität, vier lokalisierte Statusbeschriftungen in `de-CH`, ein neutraler Tag). `node --check` für beide neuen Dateien erfolgreich. Die lokal geprüften Git-Blobs werden nach Push abgeglichen: Helper `868bc79c9b14bdbe6a20bd50ea393f0225937a9f` und Node-Test `f01d5392d63e0a63bcb2cd0025594ac36ee6b48b`. Ein weiterer Original-Home-Vitest-Quellvertrag wurde ergänzt, **noch nicht in Vitest ausgeführt**. Diese Prüfungen sind kein echter VoiceOver-Gerätetest und kein vollständiger React-/Vite-Build.

## Wochennavigation: horizontalen Scrollversatz zurücksetzen (Fortsetzung)

Nach dem vorherigen `revealHomeToday`-Fix konnte eine andere Kalenderwoche den horizontalen Versatz der heutigen Woche erben, da das echte `div.week` beim Wechsel nicht neu gemountet wird. **In Chromium reproduziert:** auf 320px Breite scrollte der aktuelle Sonntag auf `scrollLeft=76` (LTR) beziehungsweise `-76` (RTL); nach dem Wechsel in eine andere Woche blieb derselbe Wert zunächst unverändert. Dies verdeckte die ersten Tage der ausgewählten Woche.

**Behoben im originalen `Home.jsx`:** Der ohnehin vorhandene Effekt ruft nun die neue Funktion `syncHomeWeekScroll(weekStripRef.current, weekOffset === 0)` auf. In der aktuellen Woche bleibt das bereits geprüfte `revealHomeToday` erhalten. Für jede andere Woche wird `scrollLeft` auf `0` gesetzt, was in LTR und RTL der **logische Wochenanfang** ist. Die bestehende Bedingung `!rotating` bleibt. Es werden weder Kalender-/Trainingsdaten noch der vertikale Seiten-Scroll, der Fokus oder die Touch-Gesten geändert.

**Tatsächlich ausgeführt vor dem Push:** Node 22.16.0, `node --check` für Helper und Test, `node scripts/check-red-fit-week-reveal.mjs`: **12/12** Funktions- und No-op-Fälle bestanden. Chromium in einer isolierten HTML/CSS-Ansicht mit der originalen `red-fit-home.css`: **84/84 vollständige aktuelle Woche → andere Woche → aktuelle Woche-Zyklen** bestanden (6 Breiten, 2 Textrichtungen, 7 Wochentage); die Kalenderposition war für andere Wochen 0, der aktuelle Tag bei Rückkehr vollständig sichtbar, `window.scrollY` konstant. Git-Blob-SHAs des getesteten Helpers und des Node-Skripts: `0791401bed4387c4fead9e0c57939084a7c0a6a3` / `114bdf45be89dc343e918db13c153053c0a39262`. Der bestehende React-Vitest-Quellvertrag wurde angepasst und um ein zustandsbezogenes Unit-Assertion für beide Scrollrichtungen ergänzt, **noch nicht in Vitest ausgeführt**. Isolierte Chromium-Prüfung ist keine vollständige React-/WebKit-/iPhone-Abnahme.
