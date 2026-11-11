// Run after cap sync: source configuration alone cannot prove the synced native
// shell actually dropped a third-party SDK. No personal data or network access.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

for (const file of ['ios/App/Podfile', 'ios/App/Podfile.lock', 'ios/App/App/capacitor.config.json']) {
  const contents = readFileSync(file, 'utf8')
  assert.doesNotMatch(contents, /MLKit|Mlkit|BarcodeScannerPlugin|GoogleDataTransport|GoogleUtilities|GTMSessionFetcher/,
    file + ' must not include the excluded Google scanner/telemetry SDK')
}
console.log('Synced iOS pods and native plugin registry exclude Google ML Kit and its telemetry dependencies')
