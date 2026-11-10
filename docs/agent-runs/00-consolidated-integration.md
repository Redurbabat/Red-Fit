# RED Fit — konsolidierte Integration (Draft)

Stand 10.11.2026. `main` unverändert. **Original-openGym** unter `vendor/opengym-upstream/frontend/` ist die Produktbasis; Root-`src/` bleibt Legacy-Referenz.

## Quellen

- PR #11: `8110296904fba578a2a73e7c7374c38728791fdb`
- PR #12: `af0aa0daf7432705ad82a52981fa3a91dbf810ca`
- PR #13: `a10087174af0ee6fcd705647ed4267b872ed344d`
- PR #14: `e433d3ba87924e783fa74313f24940f698b3b5f0`
- PR #15: `db1f3b2043595853b67a2a03d6a12b62c4c588df`

## Explizite Konfliktlösung

- `vendor/opengym-upstream/frontend/src/components/TabBar.jsx`: Agent-02-React/RED-Morph-Variante mit vorhandener Agent-04-Native-`redfit:native-dock`-Brücke, fünf Tabs, Web-Fallback und Bewegungs-/A11y-Verhalten. Nativen iPhone-Echtgerätetest nicht vorwegnehmen.
- `vendor/opengym-upstream/frontend/src/views/Home.jsx`: Agent-02-Home, Week-Strip/RED-Morph und A11y + Agent-03-Ernährungskarte und `/nutrition`-Navigation; Branding aus Agent 02/04 erhalten.
- `obsidian/08-STATUS-UND-TESTS.md`: Agent-03-Nutrition- und Agent-04-IPA-Nachweise mit Integrationsstatus kombiniert.

Alle übrigen geänderten Pfade aus fünf Agentenbranches als unveränderte Git-Blobs integriert; Ursprungs-PRs als offene Nachverfolgung stehen lassen, nicht automatisch schliessen.

## Getrennte Build-Nachweise vor der Integration

- Agent 04: Root-CI `42733049988` success; iOS-Simulator-XCUITest `42733050029` failure, weil Home nach Onboarding nicht gefunden wurde.
- Agent 02: kombinierter Simulator-Workflow `42732459798` success; Root-CI `42732459853` Lintfehler (alte `setNotes.ts`-Regex).
- Agent 03: Ernährungsworkflow `42715980363` success.
- Agent 05: openGym-Frontend-QA `42706564048` success.
- Fix für die alte Root-Lintregel ist im Agent-04-Code enthalten, aber die integrierte CI muss dies bestätigen.

## Noch zu testen

1. Root `npm ci && npm run typecheck && npm run lint && npm run test && npm run build`.
2. `cd vendor/opengym-upstream/frontend && npm ci && npm run test && npm run build`; angepasster iOS-Build/QA-Skripte.
3. iPhone-Simulator-XCUITest (besonders Onboarding/Home), native Navigation, Watch/Widgets, aktive Workouts/Satz-Undo, Offline-Start, Ernährung/Backup.
4. Apple-Signing, fünf native Targets, App-Groups und echte iPhone-Installation: **nicht abgeschlossen**. Android/Windows ebenfalls offen.

## Schutzmassnahmen

GitHub meldet Repository-Sichtbarkeit `public`, die Projektdoku verlangt `private`; vor Weitergabe von Installationsartefakten klären. Keine Secrets, persönlichen Daten, öffentlichen Cloudflare-/Store-Deploys oder ungeprüften Datenmigrationen. Bestehende LICENSE/NOTICE und separate Medienrechte erhalten.
