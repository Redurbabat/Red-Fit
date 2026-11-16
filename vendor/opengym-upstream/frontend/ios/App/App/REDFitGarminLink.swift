import Foundation
#if canImport(ConnectIQ)
import ConnectIQ
#endif

/*
 * The iPhone's end of the Garmin watch link (docs/GARMIN.md "The phone side", watch app in
 * frontend/garmin). The page already builds the cut-down Garmin snapshot (lib/garmin-snapshot.js)
 * and hands it to WatchBridge.sendSnapshot as `garmin`; this sends it to the RED Fit Connect IQ app
 * on the watch and writes what the watch sends back (`events`) into the same queue as the Apple
 * Watch's, so the page applies both the same way.
 *
 * The link runs through Garmin's Connect IQ Mobile SDK (ConnectIQ.xcframework, Garmin's licence,
 * not open source). It is only compiled in when that framework is added to the App target; without
 * it every call here is a no-op and status reports `garminAvailable: false`. Messages go over the
 * Garmin Connect app on this phone to the paired watch; RED Fit sends no data anywhere else.
 */
final class RFGarminLink: NSObject {
    static let shared = RFGarminLink()
    /// The Connect IQ app id from frontend/garmin/manifest.xml; it never changes.
    static let appId = UUID(uuidString: "3c533c63-754d-4018-9c00-0ad529e400b9")!
    /// Garmin Connect hands the chosen watches back through this URL scheme (Info.plist).
    static let urlScheme = "redfit-ciq"

    /// Watch events (setDone, start, finish, discard) for WatchBridge's queue.
    var onEvents: (([[String: Any]]) -> Void)?
    /// Connected watch or app state changed: the page asks status() again.
    var onState: (() -> Void)?

    private(set) var connected = false
    private(set) var installed = false
    private var lastSnapshot: [String: Any]?

    static var available: Bool {
        #if canImport(ConnectIQ)
        return true
        #else
        return false
        #endif
    }

    func status() -> [String: Any] {
        ["garminAvailable": Self.available, "garmin": connected && installed, "garminConnected": connected]
    }

    /// The snapshot the page cut for Garmin (JSON); sent as a dictionary, Monkey C has no JSON parser.
    func send(snapshotJSON: String) {
        guard let data = snapshotJSON.data(using: .utf8),
              let snapshot = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return }
        lastSnapshot = snapshot
        transmit(snapshot)
    }

    /// Events from the watch: `hello` asks for the latest snapshot again, the rest go to the page.
    func receive(_ message: Any) {
        guard let dict = message as? [String: Any], let events = dict["events"] as? [[String: Any]] else { return }
        if events.contains(where: { $0["type"] as? String == "hello" }), let lastSnapshot { transmit(lastSnapshot) }
        let forPage = events.filter { $0["type"] as? String != "hello" && $0["id"] is String }
        if !forPage.isEmpty { onEvents?(forPage) }
    }

    #if canImport(ConnectIQ)
    private var devices: [IQDevice] = []
    private var apps: [UUID: IQApp] = [:]
    private static let devicesKey = "redfit.garmin.devices"
    private var started = false

    /// Once per launch: the SDK and the watches chosen earlier.
    func start() {
        guard !started else { return }
        started = true
        ConnectIQ.sharedInstance().initialize(withUrlScheme: Self.urlScheme, uiOverrideDelegate: nil)
        restoreDevices()
    }

    /// Hands over to Garmin Connect, which lists the paired watches and returns the choice by URL.
    func chooseDevices() {
        start()
        ConnectIQ.sharedInstance().showDeviceSelection()
    }

    /// The URL Garmin Connect returns with; true when it was Garmin's.
    @discardableResult
    func handle(url: URL) -> Bool {
        guard url.scheme == Self.urlScheme else { return false }
        start()
        let chosen = ConnectIQ.sharedInstance().parseDeviceSelectionResponse(from: url) as? [IQDevice] ?? []
        guard !chosen.isEmpty else { return true }
        devices = chosen
        saveDevices()
        listen()
        return true
    }

    private func restoreDevices() {
        guard let data = UserDefaults.standard.data(forKey: Self.devicesKey),
              let list = try? NSKeyedUnarchiver.unarchivedArrayOfObjects(ofClass: IQDevice.self, from: data) else { return }
        devices = list
        listen()
    }

    private func saveDevices() {
        if let data = try? NSKeyedArchiver.archivedData(withRootObject: devices, requiringSecureCoding: false) {
            UserDefaults.standard.set(data, forKey: Self.devicesKey)
        }
    }

    private func listen() {
        let iq = ConnectIQ.sharedInstance()
        iq.unregister(forAllDeviceEvents: self)
        iq.unregister(forAllAppMessages: self)
        apps = [:]
        for device in devices {
            iq.register(forDeviceEvents: device, delegate: self)
            let app = IQApp(uuid: Self.appId, store: nil, device: device)
            apps[device.uuid] = app
            iq.register(forAppMessages: app, delegate: self)
        }
    }

    private func transmit(_ snapshot: [String: Any]) {
        guard connected, installed else { return }
        let iq = ConnectIQ.sharedInstance()
        for app in apps.values {
            iq.sendMessage(snapshot, to: app, progress: nil, completion: nil)
        }
    }

    private func refreshAppStatus(_ device: IQDevice) {
        guard let app = apps[device.uuid] else { return }
        ConnectIQ.sharedInstance().getAppStatus(app) { [weak self] status in
            DispatchQueue.main.async {
                self?.installed = status?.isInstalled ?? false
                self?.onState?()
                if self?.installed == true, let snapshot = self?.lastSnapshot { self?.transmit(snapshot) }
            }
        }
    }
    #else
    func start() {}
    func chooseDevices() {}
    @discardableResult func handle(url: URL) -> Bool { false }
    private func transmit(_ snapshot: [String: Any]) {}
    #endif
}

#if canImport(ConnectIQ)
extension RFGarminLink: IQDeviceEventDelegate, IQAppMessageDelegate {
    func deviceStatusChanged(_ device: IQDevice!, status: IQDeviceStatus) {
        DispatchQueue.main.async {
            self.connected = status == .connected
            if status == .connected { self.refreshAppStatus(device) } else { self.installed = false; self.onState?() }
        }
    }

    func receivedMessage(_ message: Any!, from app: IQApp!) {
        DispatchQueue.main.async { self.receive(message as Any) }
    }
}
#endif
