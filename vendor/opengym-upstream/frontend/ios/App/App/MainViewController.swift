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
    private var redFitSystemBar: UITabBar?
    private var redFitSystemBarHeight: NSLayoutConstraint?
    private var redFitSystemBarDelegate: REDFitSystemBarDelegate?
    private lazy var redFitDockHandler = REDFitDockMessageHandler(owner: self)

    private var supportsREDNativeDock: Bool {
        if #available(iOS 26.0, *) {
            return UIDevice.current.userInterfaceIdiom == .phone
        }
        return false
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        installREDNativeDockIfNeeded()
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        // Keep the Home-indicator space in the native bar after rotation or
        // a system inset change; WKWebView is never replaced or reparented.
        redFitSystemBarHeight?.constant = max(83, view.safeAreaInsets.bottom + 56)
    }

    private func installREDNativeDockIfNeeded() {
        guard supportsREDNativeDock, redFitSystemBar == nil else { return }

        // The actual UIKit system tab bar, not a hand-drawn SwiftUI/HTML
        // imitation of Apple's iOS 26 navigation material. UIKit determines
        // Liquid Glass, selection feedback, icons and accessibility behavior.
        // The original Capacitor WKWebView remains the only content owner.
        let bar = UITabBar()
        let definitions: [(String, String)] = [
            ("Home", "house"),
            ("Plan", "calendar"),
            ("Start", "play.fill"),
            ("Stats", "chart.bar"),
            ("Exercises", "dumbbell"),
        ]
        bar.items = definitions.enumerated().map { index, item in
            let tab = UITabBarItem(title: item.0, image: UIImage(systemName: item.1), tag: index)
            tab.accessibilityIdentifier = "redfit-tab-" + ["home", "plan", "start", "stats", "library"][index]
            return tab
        }
        let delegate = REDFitSystemBarDelegate(owner: self)
        bar.delegate = delegate
        redFitSystemBarDelegate = delegate  // UITabBar.delegate is weak.
        bar.selectedItem = bar.items?.first
        bar.tintColor = .systemRed
        bar.accessibilityIdentifier = "redfit-system-tabbar"
        bar.isHidden = !redFitDockModel.visible
        bar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bar)
        let height = bar.heightAnchor.constraint(equalToConstant: max(83, view.safeAreaInsets.bottom + 56))
        NSLayoutConstraint.activate([
            bar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            height,
        ])
        redFitSystemBarHeight = height
        redFitSystemBar = bar
        applyREDNativeDockState()
    }

    private func applyREDNativeDockState() {
        guard let bar = redFitSystemBar else { return }
        let identifiers = ["home", "plan", "start", "stats", "library"]
        if let index = identifiers.firstIndex(of: redFitDockModel.selected) {
            bar.selectedItem = bar.items?.first(where: { $0.tag == index })
        }
        for (index, key) in ["home", "plan", "stats", "library"].enumerated() {
            let tabIndex = index < 2 ? index : index + 1 // Skip the Start action.
            if let title = redFitDockModel.labels[key], !title.isEmpty {
                bar.items?.first(where: { $0.tag == tabIndex })?.title = title
            }
        }
        if let home = bar.items?.first(where: { $0.tag == 0 }) {
            home.badgeValue = redFitDockModel.connectionTrouble ? "!" : nil
            home.badgeColor = .systemOrange
        }
        if let start = bar.items?.first(where: { $0.tag == 2 }) {
            start.title = redFitDockModel.startLabel
            // UIKit announces the same localized and state-accurate title as the visible tab.
            // A separate English-only accessibilityLabel would misread Edit/Workout/Resume.
        }
        bar.isHidden = !redFitDockModel.visible
    }

    fileprivate func receiveREDNativeDockState(_ message: Any) {
        guard supportsREDNativeDock, let state = message as? [String: Any] else { return }
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

private final class REDFitDockState {
    var visible = false
    var selected = "home"
    var running = false
    var startLabel = "Start"
    var connectionTrouble = false
    var labels: [String: String] = [:]
}

// UITabBarDelegate forwards the original five navigation intentions to the
// existing React Router. The controller never creates another web view or
// a second workout store. Repeated taps retain RED Fit's scroll-to-top behavior.
private final class REDFitSystemBarDelegate: NSObject, UITabBarDelegate {
    weak var owner: MainViewController?
    private let tabs = ["home", "plan", "start", "stats", "library"]

    init(owner: MainViewController) {
        self.owner = owner
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        guard tabs.indices.contains(item.tag) else { return }
        owner?.openREDNativeTab(tabs[item.tag])
    }
}
