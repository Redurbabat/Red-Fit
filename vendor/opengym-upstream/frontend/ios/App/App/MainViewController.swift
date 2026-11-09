import Capacitor
import UIKit
import UserNotifications
import WebKit
import SwiftUI

/**
 * The app's own bridge view controller (Main.storyboard). Since Capacitor 6 the bridge only loads
 * the plugins that come from npm packages (packageClassList in capacitor.config.json); plugins
 * that live in the app itself are registered here, or the page finds none of them.
 */
class MainViewController: CAPBridgeViewController {
    /// The downloaded animation packs, read through Background Assets (AnimationPacksPlugin.swift).
    private let packFiles = AnimationPackSchemeHandler()
    private let redFitDockModel = REDFitDockState()
    private var redFitDockController: UIViewController?
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

    private func installREDNativeDockIfNeeded() {
        guard supportsREDNativeDock, redFitDockController == nil else { return }
        if #available(iOS 26.0, *) {
            let hosting = UIHostingController(rootView: REDFitGlassDock(model: redFitDockModel) { [weak self] tab in
                self?.openREDNativeTab(tab)
            })
            hosting.view.backgroundColor = .clear
            hosting.view.isOpaque = false
            hosting.view.translatesAutoresizingMaskIntoConstraints = false
            addChild(hosting)
            view.addSubview(hosting.view)
            NSLayoutConstraint.activate([
                hosting.view.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 12),
                hosting.view.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -12),
                hosting.view.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -8),
            ])
            hosting.didMove(toParent: self)
            redFitDockController = hosting
            hosting.view.isHidden = !redFitDockModel.visible
        }
    }

    fileprivate func receiveREDNativeDockState(_ message: Any) {
        guard supportsREDNativeDock, let state = message as? [String: Any] else { return }
        if let selected = state["selected"] as? String,
           ["home", "plan", "stats", "library"].contains(selected) {
            redFitDockModel.selected = selected
        }
        if let running = state["running"] as? Bool { redFitDockModel.running = running }
        if let label = state["startLabel"] as? String { redFitDockModel.startLabel = label }
        if let visible = state["visible"] as? Bool {
            redFitDockModel.visible = visible
            redFitDockController?.view.isHidden = !visible
        }
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

private final class REDFitDockState: ObservableObject {
    @Published var visible = false
    @Published var selected = "home"
    @Published var running = false
    @Published var startLabel = "Start"
}

// RED-Bit's reference is a system-owned SwiftUI TabView with native glass.
// openGym is a single persistent Capacitor WKWebView, so a second TabView
// would create/reparent web controllers and lose live workout/navigation state.
// This single SwiftUI glass surface preserves the original React Router and
// uses the same iOS 26 native glassEffect material as RED-Bit.
@available(iOS 26.0, *)
private struct REDFitGlassDock: View {
    @ObservedObject var model: REDFitDockState
    let selectTab: (String) -> Void

    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let green = Color(red: 48.0 / 255, green: 209.0 / 255, blue: 88.0 / 255)

    var body: some View {
        Group {
            if reduceTransparency {
                dockContent
                    .background(Color(uiColor: .secondarySystemGroupedBackground), in: Capsule())
            } else {
                dockContent
                    .glassEffect(.regular, in: Capsule())
            }
        }
        .overlay(Capsule().strokeBorder(Color.primary.opacity(0.10), lineWidth: 0.5))
        .shadow(color: .black.opacity(0.25), radius: 16, y: 7)
        .accessibilityElement(children: .contain)
    }

    private var dockContent: some View {
        HStack(spacing: 0) {
            tab("home", symbol: "house", title: "Home")
            tab("plan", symbol: "calendar", title: "Plan")
            startTab
            tab("stats", symbol: "chart.bar", title: "Stats")
            tab("library", symbol: "dumbbell", title: "Exercises")
        }
        .padding(.horizontal, 6)
        .padding(.top, 7)
        .padding(.bottom, 8)
    }

    private func tab(_ id: String, symbol: String, title: String) -> some View {
        let selected = model.selected == id
        return Button {
            selectTab(id)
        } label: {
            VStack(spacing: 4) {
                Image(systemName: symbol)
                    .font(.system(size: 22, weight: selected ? .semibold : .regular))
                    .frame(height: 32)
                Text(title)
                    .font(.system(size: 10, weight: selected ? .semibold : .medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .foregroundStyle(selected ? green : Color.primary.opacity(0.80))
            .frame(maxWidth: .infinity, minHeight: 60)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private var startTab: some View {
        Button {
            selectTab("start")
        } label: {
            VStack(spacing: 3) {
                Image(systemName: "play.fill")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.black)
                    .frame(width: 52, height: 52)
                    .background(model.running ? Color.orange : green, in: Circle())
                    .shadow(color: (model.running ? Color.orange : green).opacity(0.28), radius: 9, y: 2)
                Text(model.startLabel)
                    .font(.system(size: 10, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
                    .foregroundStyle(model.running ? Color.orange : green)
            }
            .frame(maxWidth: .infinity, minHeight: 65)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(model.running ? "Resume workout" : "Start workout")
    }
}
