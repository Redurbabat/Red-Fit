import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { parseProjectBundleIds, plistString, verifyIOSIdentity } from './verify-ios-identity.mjs'

const plist = (entries) => '<plist><dict>\n' +
  Object.entries(entries).map(([key, value]) => '  <key>' + key + '</key>\n  <string>' + value + '</string>').join('\n') +
  '\n</dict></plist>'
const group = 'group.ch.redurbabat.redfit'
const xcodeID = 'ch.redurbabat.redfit'
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
    'ios/App/WatchWidgets/Info.plist': plist({ CFBundleDisplayName: 'RED Fit' }),
    'ios/App/AnimationPacksDownloader/Info.plist': plist({
      CFBundleDisplayName: 'RED Fit animations', BAAppGroupID: group,
    }),
    'ios/App/WatchWidgets/OpenGymWatchWidgets.entitlements': shared,
    'ios/App/AnimationPacksDownloader/AnimationPacksDownloader.entitlements': shared,
    'ios/ci/add-widgets.rb': "BUNDLE_ID = 'ch.redurbabat.redfit.widgets'",
    'ios/ci/add-watch-app.rb': "BUNDLE_ID = 'ch.redurbabat.redfit.watchkitapp'\ns['PRODUCT_BUNDLE_IDENTIFIER'] = \"#{BUNDLE_ID}.widgets\"",
    'ios/ci/add-asset-downloader.rb': "BUNDLE_ID = 'ch.redurbabat.redfit.AnimationPacksDownloader'",
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
    'PRODUCT_BUNDLE_IDENTIFIER = ch.redurbabat.redfit;\n' +
    'PRODUCT_BUNDLE_IDENTIFIER = "ch.redurbabat.redfit";\n',
  ), ['ch.redurbabat.redfit', 'ch.redurbabat.redfit'])
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
test('old openGym bundle ID is rejected even when Xcode matches it', () => {
  withFixture(({ root, write }) => {
    const legacy = 'ch.opengym.app'
    write('capacitor.config.json', JSON.stringify({ appId: legacy, appName: 'RED Fit' }))
    write('ios/App/App.xcodeproj/project.pbxproj', 'PRODUCT_BUNDLE_IDENTIFIER = ' + legacy + ';')
    assert.throws(() => verifyIOSIdentity(root), /RED Fit bundle ID/)
  })
})

test('mismatched Capacitor app ID is rejected before iPhone build', () => {
  withFixture(({ root, write }) => {
    write('capacitor.config.json', JSON.stringify({ appId: 'com.example.wrong', appName: 'RED Fit' }))
    assert.throws(() => verifyIOSIdentity(root), /must match Xcode main target bundle ID/)
  })
})
test('embedded target IDs in the committed Xcode project do not fail the main target check', () => {
  withFixture(({ root, write }) => {
    write('ios/App/App.xcodeproj/project.pbxproj', ['', '.widgets', '.watchkitapp', '.watchkitapp.widgets', '.AnimationPacksDownloader', '.uitests']
      .map((suffix) => 'PRODUCT_BUNDLE_IDENTIFIER = ' + xcodeID + suffix + ';').join('\n'))
    assert.match(verifyIOSIdentity(root), /identity OK/)
    write('ios/App/App.xcodeproj/project.pbxproj', 'PRODUCT_BUNDLE_IDENTIFIER = ch.opengym.app;\nPRODUCT_BUNDLE_IDENTIFIER = ' + xcodeID + '.widgets;')
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

test('all five Apple targets reject an extension bundle ID mismatch before signing', () => {
  withFixture(({ root, write }) => {
    write('ios/ci/add-watch-app.rb', "BUNDLE_ID = 'ch.redurbabat.redfit.WRONG'\ns['PRODUCT_BUNDLE_IDENTIFIER'] = \"#{BUNDLE_ID}.widgets\"")
    assert.throws(() => verifyIOSIdentity(root), /Watch bundle ID mismatch/)
  })
})
test('Watch widget App Group mismatch is rejected', () => {
  withFixture(({ root, write }) => {
    write('ios/App/WatchWidgets/OpenGymWatchWidgets.entitlements', '<string>group.invalid</string>')
    assert.throws(() => verifyIOSIdentity(root), /watch widgets app group mismatch/)
  })
})
test('background downloader BAAppGroupID mismatch is rejected', () => {
  withFixture(({ root, write }) => {
    write('ios/App/AnimationPacksDownloader/Info.plist', plist({
      CFBundleDisplayName: 'RED Fit animations', BAAppGroupID: 'group.invalid',
    }))
    assert.throws(() => verifyIOSIdentity(root), /downloader BAAppGroupID mismatch/)
  })
})
test('Watch widget and downloader display names must be branded', () => {
  withFixture(({ root, write }) => {
    write('ios/App/WatchWidgets/Info.plist', plist({ CFBundleDisplayName: 'openGym' }))
    assert.throws(() => verifyIOSIdentity(root), /watch widgets display name/)
    write('ios/App/WatchWidgets/Info.plist', plist({ CFBundleDisplayName: 'RED Fit' }))
    write('ios/App/AnimationPacksDownloader/Info.plist', plist({
      CFBundleDisplayName: 'openGym', BAAppGroupID: group,
    }))
    assert.throws(() => verifyIOSIdentity(root), /downloader display name/)
  })
})
