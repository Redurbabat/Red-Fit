import Capacitor
import UIKit
import UserNotifications
import WebKit

// Applies before JavaScript starts, including resumed background tasks from older builds.
enum REDFitPrivacy {
    static let localOnly = true
}

/**
 * The app's own bridge view controller (Main.storyboard). Since Capacitor 6 the bridge only loads
 * the plugins that come from npm packages (packageClassList in capacitor.config.json); plugins
 * that live in the app itself are registered here, or the page finds none of them.
 */
class MainViewController: CAPBridgeViewController {
    /// The downloaded animation packs, read through Background Assets (AnimationPacksPlugin.swift).
    private let packFiles = AnimationPackSchemeHandler()
    private let redFitDockModel = REDFitDockState()
    private lazy var redFitDockHandler = REDFitDockMessageHandler(owner: self)

    private var supportsREDNativeDock: Bool {
        if #available(iOS 26.0, *) {
            return UIDevice.current.userInterfaceIdiom == .phone
        }
        return false
    }

    private func applyREDNativeDockState() {
        (tabBarController as? REDFitNativeTabController)?.apply(redFitDockModel)
    }

    fileprivate func receiveREDNativeDockState(_ message: Any) {
        guard supportsREDNativeDock, let state = message as? [String: Any] else { return }
        if state["type"] as? String == "hello" {
            (tabBarController as? REDFitNativeTabController)?.announceReady()
            return
        }
        if let selected = state["selected"] as? String,
           ["home", "plan", "start", "stats", "library"].contains(selected) {
            redFitDockModel.selected = selected
        }
        if let running = state["running"] as? Bool { redFitDockModel.running = running }
        if let label = state["startLabel"] as? String { redFitDockModel.startLabel = label }
        if let labels = state["labels"] as? [String: String] { redFitDockModel.labels = labels }
        if let trouble = state["connectionTrouble"] as? Bool { redFitDockModel.connectionTrouble = trouble }
        if let visible = state["visible"] as? Bool { redFitDockModel.visible = visible }
        applyREDNativeDockState()
    }

    fileprivate func openREDNativeTab(_ tab: String) {
        guard ["home", "plan", "start", "stats", "library"].contains(tab) else { return }
        // React Router and the existing startWorkout function remain the only
        // navigation/workout owners. The native surface sends an intention, never
        // recreates the WKWebView or changes its saved workout state.
        let script = "window.dispatchEvent(new CustomEvent('redfit:native-dock', {detail: {tab: '" + tab + "'}}))"
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    override open func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        config.setURLSchemeHandler(packFiles, forURLScheme: AnimationPackSchemeHandler.scheme)
        if supportsREDNativeDock {
            config.userContentController.add(redFitDockHandler, name: "redFitDock")
        }
        // The dedicated dock-navigation XCTest must not wait on an optional
        // iOS Health authorization sheet. Skip only the app's introductory
        // permission explanations; NEVER grant OS permissions or change
        // the onboarding path for a normally launched RED Fit app.
        if ProcessInfo.processInfo.arguments.contains("-REDFitUITestSkipOnboardingPermissions") {
            // A test-only in-memory marker works at document start, even before
            // the Capacitor origin makes localStorage available. The regular app
            // never sets this marker, nor does it grant OS permissions.
            let source = "window.__REDFitUITestSkipOnboardingPermissions = true;"
            config.userContentController.addUserScript(
                WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            )
        }
        return config
    }

    override open func capacitorDidLoad() {
        // The local training mirror, nutrition DB and custom photos must not silently enter
        // iCloud/device backups. Directory flags cover new files too; manual exports stay explicit.
        for directory in [FileManager.SearchPathDirectory.documentDirectory, .libraryDirectory] {
            if var url = FileManager.default.urls(for: directory, in: .userDomainMask).first {
                var values = URLResourceValues()
                values.isExcludedFromBackup = true
                do { try url.setResourceValues(values) }
                catch { NSLog("RED Fit: could not exclude local app directory from backup: %@", error.localizedDescription) }
            }
        }
        bridge?.registerPluginInstance(PrintPlugin())
        bridge?.registerPluginInstance(RestAlertPlugin())
        bridge?.registerPluginInstance(DeviceAuthPlugin())
        bridge?.registerPluginInstance(AnimationPacksPlugin())
        bridge?.registerPluginInstance(NudgeCheckPlugin())
        bridge?.registerPluginInstance(GymReminderPlugin())
        bridge?.registerPluginInstance(GymMapPickerPlugin())
        bridge?.registerPluginInstance(WatchBridgePlugin())
        bridge?.registerPluginInstance(AppleHealthPlugin())
        bridge?.registerPluginInstance(PhoneWorkoutPlugin())
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        bridge?.registerPluginInstance(LiveActivityPlugin())
        bridge?.registerPluginInstance(AppIconPlugin())
        bridge?.registerPluginInstance(NfcTagsPlugin())
        bridge?.registerPluginInstance(VoiceBridgePlugin())
        WidgetPreview.runIfAsked()
        // After loadView has finished: the view is the web view only once it has.
        if ProcessInfo.processInfo.arguments.contains(MainViewController.pendingProbeArgument) {
            DispatchQueue.main.async { [weak self] in self?.showPendingProbe() }
        }
    }

    /**
     * For the UI tests only (ios/App/AppUITests): launched with this argument, the app shows the
     * ids of the local notifications iOS holds for it, as a tiny label a test can read. A UI test
     * runs in its own process and cannot ask UNUserNotificationCenter about another app, and this
     * is what iOS really has pending, not what the page meant to schedule. Never shown otherwise:
     * nothing but XCUIApplication.launchArguments passes the argument.
     */
    static let pendingProbeArgument = "-OpenGymUITestPending"

    private func showPendingProbe() {
        // On the window, not inside the web view: what a WKWebView holds is its page as far as
        // accessibility goes, and a label among its subviews may never reach the test.
        guard let host = view.window else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.showPendingProbe() }
            return
        }
        let label = UILabel()
        label.accessibilityIdentifier = "og-pending-notifications"
        label.font = .systemFont(ofSize: 8)
        label.textColor = .systemGray
        label.numberOfLines = 1
        label.isUserInteractionEnabled = false
        label.text = "pending:"
        label.translatesAutoresizingMaskIntoConstraints = false
        host.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: host.leadingAnchor, constant: 2),
            label.bottomAnchor.constraint(equalTo: host.bottomAnchor, constant: -2),
        ])
        Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak label] _ in
            UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
                let ids = requests.map { $0.identifier }.sorted().joined(separator: ",")
                DispatchQueue.main.async {
                    guard let label = label else { return }
                    label.text = "pending:" + ids
                    label.accessibilityLabel = "pending:" + ids
                    label.superview?.bringSubviewToFront(label)
                }
            }
        }
    }
}


// A weak message proxy avoids retaining the Capacitor controller through the
// WKUserContentController. Only native iPhone iOS 26 registers this handler.
private final class REDFitDockMessageHandler: NSObject, WKScriptMessageHandler {
    weak var owner: MainViewController?

    init(owner: MainViewController) {
        self.owner = owner
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "redFitDock" else { return }
        owner?.receiveREDNativeDockState(message.body)
    }
}

fileprivate final class REDFitDockState {
    var visible = false
    var selected = "home"
    var running = false
    var startLabel = "Start"
    var connectionTrouble = false
    var labels: [String: String] = [:]
}

// The window owns Apple's complete tab container. A standalone UITabBar added
// inside CAPBridgeViewController.view is nested *inside WKWebView*, which both
// hides it from native accessibility and misses the system's floating glass layout.
// Five native route hosts share ONE existing Capacitor controller, WKWebView and store.
final class REDFitNativeTabController: UITabBarController, UITabBarControllerDelegate {
    private let bridgeController: MainViewController
    private var hosts: [REDFitRouteHost] = []
    private var dockVisible = false
    private var reservedBottom: CGFloat = 0

    init(bridge: MainViewController) {
        bridgeController = bridge
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("Created around the existing storyboard bridge") }

    override func viewDidLoad() {
        super.viewDidLoad()
        delegate = self
        let definitions = [
            ("home", "Home", "house"), ("plan", "Plan", "calendar"),
            ("start", "Start", "play.fill"), ("stats", "Stats", "chart.bar"),
            ("library", "Exercises", "dumbbell"),
        ]
        hosts = definitions.enumerated().map { index, definition in
            let host = REDFitRouteHost(route: definition.0)
            host.tabBarItem = UITabBarItem(title: definition.1, image: UIImage(systemName: definition.2), tag: index)
            host.tabBarItem.accessibilityIdentifier = "redfit-tab-" + definition.0
            return host
        }
        setViewControllers(hosts, animated: false)
        customizableViewControllers = nil
        tabBar.accessibilityIdentifier = "redfit-system-tabbar"
        tabBar.tintColor = .systemRed
        // Keep UIKit's default material, floating shape, selection and accessibility.
        // No custom background image, opaque appearance, blur layer or fixed bar frame.
        if #available(iOS 26.0, *) {
            tabBarMinimizeBehavior = UIAccessibility.isReduceMotionEnabled ? .never : .onScrollDown
        }
        moveBridge(to: hosts[0])
        if #available(iOS 18.0, *) { setTabBarHidden(true, animated: false) }
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        announceReady()
    }

    fileprivate func announceReady() {
        // The bridge's storyboard view may load before SceneDelegate wraps it.
        // A channel alone must not hide the web dock: acknowledge the real root
        // container, including after a page reload or a late React mount.
        bridgeController.webView?.evaluateJavaScript(
            "window.__REDFitNativeDockReady = true; window.dispatchEvent(new Event('redfit:native-dock-ready'))",
            completionHandler: nil
        )
    }

    private func moveBridge(to host: REDFitRouteHost) {
        guard bridgeController.parent !== host else { return }
        if let previous = bridgeController.parent {
            previous.setContentScrollView(nil, for: .all)
            bridgeController.willMove(toParent: nil)
            bridgeController.view.removeFromSuperview()
            bridgeController.removeFromParent()
        }
        host.addChild(bridgeController)
        host.view.addSubview(bridgeController.view)
        bridgeController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            bridgeController.view.leadingAnchor.constraint(equalTo: host.view.leadingAnchor),
            bridgeController.view.trailingAnchor.constraint(equalTo: host.view.trailingAnchor),
            bridgeController.view.topAnchor.constraint(equalTo: host.view.topAnchor),
            bridgeController.view.bottomAnchor.constraint(equalTo: host.view.bottomAnchor),
        ])
        bridgeController.didMove(toParent: host)
        // Explicitly identify the real WK scroll view so system glass edge effects
        // and onScrollDown observe the original app, including its long library list.
        host.setContentScrollView(bridgeController.webView?.scrollView, for: .all)
    }

    fileprivate func apply(_ state: REDFitDockState) {
        guard isViewLoaded, !hosts.isEmpty else { return }
        if let index = hosts.firstIndex(where: { $0.route == state.selected }) {
            moveBridge(to: hosts[index])
            if selectedIndex != index { selectedIndex = index }
        }
        for host in hosts {
            if let label = state.labels[host.route], !label.isEmpty { host.tabBarItem.title = label }
        }
        hosts[2].tabBarItem.title = state.startLabel
        hosts[0].tabBarItem.badgeValue = state.connectionTrouble ? "!" : nil
        hosts[0].tabBarItem.badgeColor = .systemOrange
        if dockVisible != state.visible {
            dockVisible = state.visible
            if #available(iOS 18.0, *) { setTabBarHidden(!state.visible, animated: false) }
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        guard dockVisible, let parent = tabBar.superview else { return }
        let frame = bridgeController.view.convert(tabBar.frame, from: parent)
        let overlap = max(0, bridgeController.view.bounds.maxY - frame.minY)
        // Reserve the expanded bar's space rather than reflowing HTML on every
        // frame of the system's minimization animation.
        if overlap > reservedBottom + 1 {
            reservedBottom = overlap
            let pixels = Int(ceil(overlap))
            bridgeController.webView?.evaluateJavaScript("document.documentElement.style.setProperty('--rf-native-dock-inset', '\(pixels)px')", completionHandler: nil)
        }
    }

    func tabBarController(_ tabBarController: UITabBarController, shouldSelect viewController: UIViewController) -> Bool {
        guard dockVisible, let host = viewController as? REDFitRouteHost else { return false }
        moveBridge(to: host)
        return true
    }

    func tabBarController(_ tabBarController: UITabBarController, didSelect viewController: UIViewController) {
        guard let host = viewController as? REDFitRouteHost else { return }
        bridgeController.openREDNativeTab(host.route)
    }
}

private final class REDFitRouteHost: UIViewController {
    let route: String
    init(route: String) { self.route = route; super.init(nibName: nil, bundle: nil) }
    required init?(coder: NSCoder) { fatalError("Created by the native tab controller") }
    override var childForStatusBarStyle: UIViewController? { children.first }
    override var childForStatusBarHidden: UIViewController? { children.first }
    override func viewDidLoad() { super.viewDidLoad(); view.backgroundColor = .systemBackground }
}
