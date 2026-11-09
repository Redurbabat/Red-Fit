import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { parseProjectBundleIds, plistString, verifyIOSIdentity } from './verify-ios-identity.mjs'

const plist = (entries) => '<plist><dict>\n' +
  Object.entries(entries).map(([key, value]) => '  <key>' + key + '</key>\n  <string>' + value + '</string>').join('\n') +
  '\n</dict></plist>'
const group = 'group.ch.opengym.app'
const xcodeID = 'ch.opengym.app'
const shared = '<string>' + group + '</string>'

function withFixture(check) {
  const root = mkdtempSync(join(tmpdir(), 'redfit-ios-identity-'))
  const files = {
    'capacitor.config.json': JSON.stringify({ appId: xcodeID, appName: 'RED Fit' }),
    'ios/App/App.xcodeproj/project.pbxproj': 'PRODUCT_BUNDLE_IDENTIFIER = ' + xcodeID + ';',
    'ios/App/App/Info.plist': plist({ CFBundleDisplayName: 'RED Fit', BAAppGroupID: group }),
    'ios/App/OpenGymWidgets/Info.plist': plist({ CFBundleDisplayName: 'RED Fit' }),
    'ios/App/Watch/Info.plist': plist({
      CFBundleDisplayName: 'RED Fit', WKCompanionAppBundleIdentifier: xcodeID,
    }),
    'ios/App/App/App.entitlements': shared,
    'ios/App/OpenGymWidgets/OpenGymWidgets.entitlements': shared,
    'ios/App/Watch/OpenGymWatch.entitlements': shared,
  }
  const plugins = ['AppleHealthPlugin.swift', 'LiveActivityPlugin.swift',
    'WidgetBridgePlugin.swift', 'PhoneWorkoutPlugin.swift']
  for (const plugin of plugins) files['ios/App/App/' + plugin] = 'import Foundation\n'
  const write = (path, content) => {
    const dest = join(root, path)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, content)
  }
  try {
    for (const [file, content] of Object.entries(files)) write(file, content)
    check({ root, write })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('Xcode parser extracts actual unquoted and quoted product IDs', () => {
  assert.deepEqual(parseProjectBundleIds(
    'PRODUCT_BUNDLE_IDENTIFIER = ch.opengym.app;\n' +
    'PRODUCT_BUNDLE_IDENTIFIER = "ch.opengym.app";\n',
  ), ['ch.opengym.app', 'ch.opengym.app'])
})
test('Xcode parser does not invent an identifier when key is absent', () => {
  assert.deepEqual(parseProjectBundleIds('PRODUCT_NAME = App;'), [])
})
test('Info.plist parser reads values across whitespace and escapes keys', () => {
  assert.equal(plistString(plist({ CFBundleDisplayName: 'RED Fit' }), 'CFBundleDisplayName'), 'RED Fit')
  assert.equal(plistString(plist({ 'A.B': 'escaped' }), 'A.B'), 'escaped')
})
test('valid original native shell passes all identity and integration checks', () => {
  withFixture(({ root }) => assert.match(verifyIOSIdentity(root), /identity OK: RED Fit/))
})
test('mismatched Capacitor app ID is rejected before iPhone build', () => {
  withFixture(({ root, write }) => {
    write('capacitor.config.json', JSON.stringify({ appId: 'com.example.wrong', appName: 'RED Fit' }))
    assert.throws(() => verifyIOSIdentity(root), /must match Xcode main target bundle ID/)
  })
})
test('widget App Group disagreement is rejected', () => {
  withFixture(({ root, write }) => {
    write('ios/App/OpenGymWidgets/OpenGymWidgets.entitlements', '<string>group.example.wrong</string>')
    assert.throws(() => verifyIOSIdentity(root), /widget app group mismatch/)
  })
})
test('missing native workout bridge is rejected', () => {
  withFixture(({ root }) => {
    unlinkSync(join(root, 'ios/App/App/PhoneWorkoutPlugin.swift'))
    assert.throws(() => verifyIOSIdentity(root), /PhoneWorkoutPlugin.swift is missing/)
  })
})
