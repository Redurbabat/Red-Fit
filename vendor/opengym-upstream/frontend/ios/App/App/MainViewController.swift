import Capacitor
import UIKit
import UserNotifications
import WebKit

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
            UITabBarItem(title: item.0, image: UIImage(systemName: item.1), tag: index)
        }
        let delegate = REDFitSystemBarDelegate(owner: self)
        bar.delegate = delegate
        redFitSystemBarDelegate = delegate  // UITabBar.delegate is weak.
        bar.selectedItem = bar.items?.first
        bar.tintColor = .systemGreen
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
        if let start = bar.items?.first(where: { $0.tag == 2 }) {
            start.title = redFitDockModel.startLabel
            start.accessibilityLabel = redFitDockModel.running ? "Resume workout" : "Start workout"
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
        if let visible = state["visible"] as? Bool { redFitDockModel.visible = visible }
        applyREDNativeDockState()
    }

    private func openREDNativeTab(_ tab: String) {
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
        return config
    }

    override open func capacitorDidLoad() {
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
}

// UITabBarDelegate forwards the original five navigation intentions to the
// existing React Router. The controller never creates another web view or
// a second workout store. Repeated taps retain openGym's scroll-to-top behavior.
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
