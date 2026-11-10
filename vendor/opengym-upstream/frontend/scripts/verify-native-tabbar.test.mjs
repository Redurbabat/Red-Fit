// Guard that RED Fit uses Apple's native UIKit control, not a drawn
// imitation, while routing through the original openGym Capacitor session.
// Static structural tests only: Xcode/device appearance still needs QA.
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const swift = read('ios/App/App/MainViewController.swift')
const react = read('src/components/TabBar.jsx')
const css = read('src/index.css')

test('native iPhone uses the unmodified Apple UITabBar component', () => {
  assert.match(swift, /let bar = UITabBar\(\)/)
  assert.match(swift, /bar\.items = definitions\.enumerated\(\)/)
  assert.match(swift, /REDFitSystemBarDelegate: NSObject, UITabBarDelegate/)
  assert.doesNotMatch(swift, /REDFitGlassDock|UIHostingController|glassEffect|UITabBarAppearance/)
})

test('all original five root destinations use SF Symbols and the current web router', () => {
  for (const pair of [
    '("Home", "house")', '("Plan", "calendar")', '("Start", "play.fill")',
    '("Stats", "chart.bar")', '("Exercises", "dumbbell")',
  ]) assert.ok(swift.includes(pair), 'missing system tab: ' + pair)
  for (const name of ['home', 'plan', 'start', 'stats', 'library']) {
    assert.ok(swift.includes('"' + name + '"'), 'missing route ' + name)
  }
  assert.match(swift, /webView\?\.evaluateJavaScript\(script/)
  assert.match(react, /window\.addEventListener\('redfit:native-dock'/)
  assert.match(react, /cur === 'workout' \? 'start'/)
})

test('original Capacitor plugins and native dock appearance gates survive', () => {
  assert.match(swift, /class MainViewController: CAPBridgeViewController/)
  assert.match(swift, /#available\(iOS 26\.0, \*\)/)
  assert.match(swift, /UIDevice\.current\.userInterfaceIdiom == \.phone/)
  for (const plugin of ['AppleHealthPlugin()', 'PhoneWorkoutPlugin()', 'WidgetBridgePlugin()', 'LiveActivityPlugin()', 'WatchBridgePlugin()']) {
    assert.ok(swift.includes(plugin), 'missing original native plugin ' + plugin)
  }
})

test('keyboard/sheet visibility and non-iPhone web fallback remain supported', () => {
  assert.match(swift, /bar\.isHidden = !redFitDockModel\.visible/)
  assert.match(react, /window\.webkit\?\.messageHandlers\?\.redFitDock/)
  assert.match(react, /#modal-root/)
  assert.match(react, /contenteditable="true"/)
  assert.match(css, /:root\[data-redfit-native-dock\] #tabbar/)
})
