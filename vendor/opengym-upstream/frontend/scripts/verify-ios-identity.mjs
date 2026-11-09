#!/usr/bin/env node
// Static iOS identity / integration guard. Does not sign, build or run the app.
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const plistString = (text, key) => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp('<key>' + escaped + '</key>\\s*<string>([^<]+)</string>').exec(text)?.[1]
}

export const parseProjectBundleIds = (project) => [...project.matchAll(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/g)]
  .map((match) => match[1].trim().replace(/^"|"$/g, ''))

export function verifyIOSIdentity(baseDir = root) {
const read = (path) => readFileSync(join(baseDir, path), 'utf8')
const capacitor = JSON.parse(read('capacitor.config.json'))
const project = read('ios/App/App.xcodeproj/project.pbxproj')
const app = read('ios/App/App/Info.plist')
const widget = read('ios/App/OpenGymWidgets/Info.plist')
const watch = read('ios/App/Watch/Info.plist')
const watchWidget = read('ios/App/WatchWidgets/Info.plist')
const downloader = read('ios/App/AnimationPacksDownloader/Info.plist')
const appEntitlements = read('ios/App/App/App.entitlements')
const widgetEntitlements = read('ios/App/OpenGymWidgets/OpenGymWidgets.entitlements')
const watchEntitlements = read('ios/App/Watch/OpenGymWatch.entitlements')
const watchWidgetEntitlements = read('ios/App/WatchWidgets/OpenGymWatchWidgets.entitlements')
const downloaderEntitlements = read('ios/App/AnimationPacksDownloader/AnimationPacksDownloader.entitlements')

assert.equal(capacitor.appName, 'RED Fit', 'Capacitor brand should be RED Fit')
const ids = parseProjectBundleIds(project)
assert.ok(ids.length > 0, 'Xcode main target must declare a bundle identifier')
assert.ok(ids.every((id) => id === capacitor.appId), 'Capacitor appId must match Xcode main target bundle ID')
for (const [name, plist] of [['app', app], ['widget', widget], ['watch', watch], ['watch widgets', watchWidget]]) {
  assert.equal(plistString(plist, 'CFBundleDisplayName'), 'RED Fit', name + ' display name')
}
assert.equal(plistString(downloader, 'CFBundleDisplayName'), 'RED Fit animations',
  'downloader display name')
const targets = [
  ['iPhone widgets', 'ios/ci/add-widgets.rb', '.widgets'],
  ['Watch', 'ios/ci/add-watch-app.rb', '.watchkitapp'],
  ['Background downloader', 'ios/ci/add-asset-downloader.rb', '.AnimationPacksDownloader'],
]
for (const [name, path, suffix] of targets) {
  const match = /^\s*BUNDLE_ID\s*=\s*'([^']+)'/m.exec(read(path))
  assert.equal(match?.[1], capacitor.appId + suffix, name + ' bundle ID mismatch')
}
assert.ok(read('ios/ci/add-watch-app.rb').includes('"#{BUNDLE_ID}.widgets"'),
  'Watch widgets bundle ID must derive from Watch bundle ID')
const group = plistString(app, 'BAAppGroupID')
assert.ok(group, 'Background asset app group must be present')
for (const [name, entitlements] of [
  ['app', appEntitlements], ['widget', widgetEntitlements], ['watch', watchEntitlements],
  ['watch widgets', watchWidgetEntitlements], ['downloader', downloaderEntitlements],
]) {
  assert.ok(entitlements.includes('<string>' + group + '</string>'), name + ' app group mismatch')
}
assert.equal(plistString(downloader, 'BAAppGroupID'), group, 'downloader BAAppGroupID mismatch')
assert.equal(plistString(watch, 'WKCompanionAppBundleIdentifier'), capacitor.appId,
  'Watch companion must use Xcode main bundle identifier')
for (const plugin of ['AppleHealthPlugin.swift', 'LiveActivityPlugin.swift', 'WidgetBridgePlugin.swift', 'PhoneWorkoutPlugin.swift']) {
  assert.ok(existsSync(join(baseDir, 'ios/App/App', plugin)), plugin + ' is missing')
}
return 'Original iOS app identity OK: RED Fit / ' + capacitor.appId + '; app groups and native integrations retained.'
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(verifyIOSIdentity())
}
