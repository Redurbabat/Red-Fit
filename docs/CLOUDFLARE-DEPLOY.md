# RED Fit auf Cloudflare Pages oder Workers deployen

> **Ab 08.11.2026:** Diese Konfiguration deployt weiterhin nur den **bisherigen RED-Fit-React/TypeScript-Core**. Die neue, eigentümerseitig gewünschte openGym-Basis enthält ein separates Node-API-Backend; `wrangler.jsonc` mit statischem `dist/` startet diesen Server nicht. Das ursprüngliche openGym-Frontend und seine API erfordern eine gesondert getestete Build-/Auth-/Sync-Deploymentarchitektur. Quelle und Status: [openGym-Übernahme](OPENGYM-BASELINE.md).

> Stand: 2026-11-08. Beide Wege deployen dieselbe RED-Fit-Vite-App (React/TypeScript, Dexie/IndexedDB). Es entsteht **keine zweite App** und **kein Backend**. Eine erfolgreiche Live-Veröffentlichung wurde hier noch nicht verifiziert.

## Empfehlung: Cloudflare Pages (Git-Integration)

1. In Cloudflare: Workers & Pages → Create application → Pages → Connect to Git.
2. GitHub-Konto verbinden und privates Repository `Redurbabat/Red-Fit` auswählen.
3. Project name: `red-fit` (falls verfügbar); production branch: `main`.
4. Framework preset: `React (Vite)`; root: `/`; build command: `npm run build`; build output: `dist`.
5. Node.js 22 als Build-Umgebung vorsehen. **Keine** App-Nutzer- oder GitHub-Token in Build-Variablen kopieren.
6. Deployment starten und Login-/Offline-/Workout-/Backup-Flows im Browser prüfen.

Cloudflare Pages behandelt React-SPA-Routen automatisch als Client-Routen, wenn `dist/404.html` **nicht** existiert. Deshalb absichtlich keine pauschale `_redirects`-Datei anlegen: Sie könnte echte `/assets/*`-Ressourcen überschreiben. `public/_headers` gelangt durch Vite nach `dist/_headers`.

**Achtung:** GitHub-Repository privat bedeutet **nicht**, dass `*.pages.dev` privat ist. Für Zugangsschutz vor echten Benutzerdaten Cloudflare Access konfigurieren oder den Deploy nicht veröffentlichen.

## Fehlerbehebung: `assets.directory ./dist` existiert nicht

Beim Cloudflare-Workers-Build vom **2026-11-08, 13:39 UTC** meldete Wrangler:

```text
[ERROR] The directory specified by the "assets.directory" field ... does not exist:
/opt/buildhome/repo/dist
```

Der Installationsschritt (`npm clean-install`, 512 Pakete) war erfolgreich, **aber Cloudflare hat vor `npx wrangler deploy` kein `npm run build` ausgeführt.** `dist/` wird absichtlich nicht in Git versioniert und entsteht erst durch `tsc && vite build`. Die `glob`-Deprecation-Warnung ist nicht der Auslöser.

**Im Cloudflare-Dashboard des bestehenden Workers** unter **Settings → Build** eintragen:

| Feld | Wert |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` (Repository-Wurzel) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Danach **Deploy erneut auslösen** (neuen `main`-Commit bauen oder neu bereitstellen). Im Log müssen aufeinander folgen: `npm ci` / `npm clean-install`, **`tsc && vite build` mit erzeugtem `dist/`**, `wrangler deploy`. Ein tatsächlich funktionierendes Deployment und eine öffentliche URL sind noch zu bestätigen.

**Alternative mit nur einem Deploy-Befehl:** Als Deploy command **`npm run deploy:workers`** verwenden und das separate Build-command-Feld *leer lassen*. Das Repo-Script führt `npm run build && npx wrangler deploy --config wrangler.jsonc` aus und stoppt bei Build-Fehler. Nicht beides kombinieren, sonst wird doppelt gebaut.

Wichtig: Laut Cloudflare [Workers Builds-Konfiguration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) werden `build`-Einstellungen im Wrangler-Konfigurationsfile von **Workers Builds derzeit ignoriert**. Darum muss das Cloudflare-Build-Feld bzw. der Deploy-Befehl im Dashboard gesetzt sein; ein `build.command` in `wrangler.jsonc` allein behebt diesen Fehler dort nicht.

## Alternative: Cloudflare Workers Static Assets

Das Repository besitzt `wrangler.jsonc` mit `assets.directory = ./dist` und `not_found_handling = single-page-application`. Es wird **kein Worker-API-Script** und keine externe Datenbank benötigt. Für diese Alternative einen Worker namens `red-fit` bereitstellen; einen anderen Namen im Wrangler-File einstellen, falls der Name belegt ist.

Auf einem Rechner mit Node 22+, Login über Wrangler und funktionierenden Projekt-Abhängigkeiten:

    npm ci
    npm run typecheck && npm run lint && npm run test && npm run build
    npx wrangler login
    npx wrangler deploy --config wrangler.jsonc

Worker-SPA-Routing: `/training`, `/nutrition` oder `/settings` werden auf `index.html` zurückgeführt, während echte Vite-Assets direkt ausgeliefert werden.

## Pages per Wrangler statt Git-Integration

Pages-Projekt einmalig anlegen, sofern es noch nicht besteht:

    npx wrangler login
    npx wrangler pages project create red-fit --production-branch main
    npm ci && npm run build
    npx wrangler pages deploy dist --project-name=red-fit --branch=main

Ein einmal über **Git-Integration** angelegtes Pages-Projekt kann später nicht zu einem reinen Direct-Upload-Projekt umgestellt werden. Wrangler-Uploads auf ein bereits angebundenes Pages-Projekt sind dennoch möglich; automatische Git-Deploys nach Bedarf im Dashboard deaktivieren, um doppelte Releases zu vermeiden.

## Manueller GitHub-Actions-Deploy

1. GitHub → `Red-Fit` → Settings → Secrets and variables → Actions → **New repository secret**.
2. `CLOUDFLARE_API_TOKEN` (auf dieses Konto/Deployment beschränkte Berechtigung) und `CLOUDFLARE_ACCOUNT_ID` getrennt hinterlegen.
3. Das Pages-Projekt `red-fit` vor dem ersten Pages-Actions-Deploy anlegen.
4. GitHub → Actions → **Deploy RED Fit to Cloudflare** → **Run workflow** → `pages` ODER `workers`.
5. Workflow deployt ausschließlich den `main`-Checkout, führt `npm ci`, Typecheck, Lint, Tests, Build aus und veröffentlicht erst danach. **Kein automatischer Cloudflare-Deploy durch einen Push.**

Der bekannte GitHub-Actions-Runner-Fehler (`runner_id=0`, keine gestarteten Steps) ist separat zu prüfen. Fehlende oder gesperrte Runner können auch diesen Workflow verhindern. Die direkte Pages-Git-Integration ist davon unabhängig.

## Datenschutz, Offline-Betrieb und Native-Apps

- RED Fit speichert Nutzerdaten lokal in IndexedDB des jeweiligen Browsers/WebViews. Deployen synchronisiert diese Daten nicht zwischen Geräten und speichert keine personenbezogenen Trainingsdaten auf Cloudflare.
- Die vorhandene PWA bleibt offlinefähig; native Capacitor-/Tauri-Builds verwenden dieselben fachlichen Module, sind aber separate installierbare Pakete.
- Cloudflare ist der **Web-Host**, kein iOS-/Android-/Windows-App-Store. iOS/Android Builds benötigen Xcode/Android Studio; Windows benötigt Rust/MSVC.
- Nach Deploy testen: direkte `/training`-URL, Reload, App-Installation, Offline-Neustart, Backup, Datenpersistenz und Service-Worker-Update ohne Datenverlust.

## Quellen

- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/configuration/serving-pages/
- https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
- https://developers.cloudflare.com/workers/static-assets/headers/
- https://developers.cloudflare.com/workers/wrangler/commands/pages/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
