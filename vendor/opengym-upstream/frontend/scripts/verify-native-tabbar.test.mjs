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
const uiTests = read('ios/App/AppUITests/OpenGymUITests.swift')
const scene = read('ios/App/App/SceneDelegate.swift')

test('native iPhone window uses the complete Apple tab controller outside WKWebView', () => {
  assert.match(swift, /class REDFitNativeTabController: UITabBarController, UITabBarControllerDelegate/)
  assert.match(scene, /window\?\.rootViewController = REDFitNativeTabController\(bridge: bridge\)/)
  assert.match(swift, /setViewControllers\(hosts, animated: false\)/)
  assert.doesNotMatch(swift, /let bar = UITabBar\(\)|view\.addSubview\(bar\)|UITabBarAppearance|UIHostingController|glassEffect/)
  assert.doesNotMatch(scene, /MainViewController\(\)/)
})

test('all original five root destinations use SF Symbols and the current web router', () => {
  for (const pair of [
    '("home", "Home", "house")', '("plan", "Plan", "calendar")', '("start", "Start", "play.fill")',
    '("stats", "Stats", "chart.bar")', '("library", "Exercises", "dumbbell")',
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

test('dock channel and document-start script attach after Capacitor replaces its content controller', () => {
  const configurationHook = swift.slice(swift.indexOf('override open func webViewConfiguration'), swift.indexOf('override open func webView(with'))
  const creationHook = swift.slice(swift.indexOf('override open func webView(with'), swift.indexOf('override open func capacitorDidLoad'))
  assert.doesNotMatch(configurationHook, /userContentController\.add/)
  assert.match(creationHook, /configuration\.userContentController\.add\(redFitDockHandler, name: "redFitDock"\)/)
  assert.match(creationHook, /configuration\.userContentController\.addUserScript/)
  assert.match(creationHook, /super\.webView\(with: frame, configuration: configuration\)/)
  assert.match(swift, /view is WKWebView/)
  assert.doesNotMatch(uiTests, /XCTAssertEqual\(app\.webViews\.count, 1/)
})

test('native callback is visible to its file-local delegate and VoiceOver names are localized', () => {
  // The iOS simulator build previously failed when this method was private:
  // The native tab controller is a separate type in the same Swift source file.
  assert.match(swift, /fileprivate func openREDNativeTab\(_ tab: String\)/)
  assert.match(swift, /bridgeController\.openREDNativeTab\(host\.route\)/)
  assert.match(swift, /hosts\[2\]\.tabBarItem\.title = state\.startLabel/)
  assert.doesNotMatch(swift, /start\.accessibilityLabel\s*=\s*redFitDockModel\.running\s*\?/)
  assert.match(react, /startLabel:|startLabel,/)
})

test('keyboard/sheet visibility and non-iPhone web fallback remain supported', () => {
  assert.match(swift, /setTabBarHidden\(!state\.visible, animated: false\)/)
  assert.match(react, /window\.webkit\?\.messageHandlers\?\.redFitDock/)
  assert.match(react, /nativeChannel\.postMessage\(\{ type: 'hello' \}\)/)
  assert.match(swift, /window\.__REDFitNativeDockReady = true/)
  assert.match(react, /#modal-root/)
  assert.match(react, /contenteditable="true"/)
  assert.match(css, /:root\[data-redfit-native-dock\] #tabbar/)
  assert.match(react, /aria-hidden=\{nativeDock \? true : undefined\}/)
})

test('system scroll effects observe the retained WKWebView and never create a new session per tab', () => {
  assert.match(swift, /tabBarMinimizeBehavior = UIAccessibility\.isReduceMotionEnabled \? \.never : \.onScrollDown/)
  assert.match(swift, /host\.setContentScrollView\(bridgeController\.webView\?\.scrollView, for: \.all\)/)
  assert.match(swift, /host\.addChild\(bridgeController\)/)
  assert.match(swift, /bridgeController\.didMove\(toParent: host\)/)
  assert.doesNotMatch(swift, /WKWebView\(|MainViewController\(\)/)
})

test('native dock smoke test skips only optional permission explanations behind a test-only launch argument', () => {
  assert.match(uiTests, /app\.launchArguments = \["-REDFitUITestSkipOnboardingPermissions"\]/)
  assert.match(swift, /ProcessInfo\.processInfo\.arguments\.contains\("-REDFitUITestSkipOnboardingPermissions"\)/)
  assert.match(swift, /WKUserScript\(source: source, injectionTime: \.atDocumentStart, forMainFrameOnly: true\)/)
  assert.match(swift, /window\.__REDFitUITestSkipOnboardingPermissions = true/)
  assert.match(read('src/lib/onboarding-perms.js'), /window\.__REDFitUITestSkipOnboardingPermissions === true/)
  assert.match(uiTests, /func test0REDFitNativeTabBarKeepsOriginalNavigation\(\)/)
})
