import SwiftUI
import WebKit
import Combine
import UniformTypeIdentifiers
import Charts
import os

// Presentation data only. Workouts, calculations and persistence remain in the original core.
struct RFRecord: Identifiable {
    let raw: [String: Any]
    init(_ raw: [String: Any] = [:]) { self.raw = raw }
    var id: String { string("id") }
    func string(_ key: String, _ fallback: String = "") -> String { raw[key] as? String ?? fallback }
    func number(_ key: String, _ fallback: Double = 0) -> Double { (raw[key] as? NSNumber)?.doubleValue ?? fallback }
    func bool(_ key: String) -> Bool { raw[key] as? Bool ?? false }
    func record(_ key: String) -> RFRecord { RFRecord(raw[key] as? [String: Any] ?? [:]) }
    func records(_ key: String) -> [RFRecord] { (raw[key] as? [[String: Any]] ?? []).map(RFRecord.init) }
}

@MainActor final class RFAppModel: ObservableObject {
    /// Phase 0 of the performance plan: when the shell started, to measure "Home visible".
    static let launchedAt = Date()
    static let log = Logger(subsystem: "ch.redurbabat.redfit", category: "startup")
    static func mark(_ step: String) { log.notice("RFStartup \(step) after \(Int(Date().timeIntervalSince(launchedAt) * 1000)) ms") }
    @Published var data = RFRecord()
    /// False while Home shows the cached copy of the last session and the core is still loading.
    @Published var live = false
    private var cacheTask: Task<Void, Never>?

    init() {
        _ = Self.launchedAt
        if let cached = RFSnapshotCache.load() {
            var raw = cached
            // A copy is for looking at only: no original sheets, toasts or timers from last time.
            raw["hasOriginalSheet"] = false
            raw["toast"] = ""
            data = RFRecord(raw)
            Self.log.notice("RFStartup cache shown after \(Int(Date().timeIntervalSince(Self.launchedAt) * 1000)) ms")
        }
    }
    @Published var error: String?
    @Published var pending = 0
    @Published var originalVisible = false
    @Published var originalTitle = "Werkzeuge"
    @Published var selected = "home"
    weak var bridge: MainViewController?
    weak var owner: RFNativeHostController?
    var active: RFRecord { data.record("active") }
    var hasActive: Bool { !active.id.isEmpty }
    var ready: Bool { data.bool("ready") }
    var accent: Color { Color(red: 0.12, green: 0.75, blue: 0.26) }
    func receive(_ message: Any) {
        guard let envelope = message as? [String: Any], envelope["v"] as? Int == 1 else { return }
        if envelope["type"] as? String == "error" { error = envelope["message"] as? String; return }
        guard let payload = envelope["payload"] as? [String: Any] else { return }
        data = RFRecord(payload)
        if !live, data.bool("ready") {
            live = true
            Self.log.notice("RFStartup core ready after \(Int(Date().timeIntervalSince(Self.launchedAt) * 1000)) ms")
        }
        if live { saveCache(payload) }
        // Original confirmations retain their real actions, focus and undo semantics.
        if data.bool("hasOriginalSheet") { originalTitle = "Training"; originalVisible = true }
    }
    /// The last snapshot, written at most every two seconds, off the main thread.
    private func saveCache(_ payload: [String: Any]) {
        cacheTask?.cancel()
        cacheTask = Task.detached(priority: .utility) {
            try? await Task.sleep(for: .seconds(2))
            if !Task.isCancelled { RFSnapshotCache.save(payload) }
        }
    }

    func request(_ action: String, _ payload: [String: Any] = [:]) async throws -> [String: Any] {
        // Taps on the cached Home wait for the core instead of failing (at most 20 s).
        var waited = 0
        while !live && waited < 200 { try await Task.sleep(for: .milliseconds(100)); waited += 1 }
        guard let web = bridge?.webView else { throw NSError(domain: "RED Fit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Der lokale App-Kern wird noch geladen."]) }
        pending += 1
        defer { pending -= 1 }
        let command: [String: Any] = ["v": 1, "id": UUID().uuidString, "action": action, "payload": payload]
        do {
            let result = try await web.callAsyncJavaScript("return await window.redFitNative.request(command)", arguments: ["command": command], in: nil, contentWorld: .page)
            return result as? [String: Any] ?? [:]
        } catch {
            let ns = error as NSError
            if let message = ns.userInfo["WKJavaScriptExceptionMessage"] as? String {
                throw NSError(domain: "RED Fit", code: ns.code, userInfo: [NSLocalizedDescriptionKey: message])
            }
            throw error
        }
    }
    func perform(_ action: String, _ payload: [String: Any] = [:], done: (() -> Void)? = nil) {
        Task { do { _ = try await request(action, payload); done?() } catch { self.error = error.localizedDescription } }
    }
    func showOriginal(_ path: String, title: String) {
        Task {
            do { _ = try await request("route", ["path": path]); originalTitle = title; originalVisible = true }
            catch { self.error = error.localizedDescription }
        }
    }
    func workout(_ operation: String, _ values: [String: Any] = [:]) {
        perform("workout", values.merging(["operation": operation, "workoutId": active.id]) { a, _ in a })
    }
}

final class RFAppMessageHandler: NSObject, WKScriptMessageHandler {
    weak var model: RFAppModel?
    init(_ model: RFAppModel) { self.model = model }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame else { return }
        model?.receive(message.body)
    }
}

// A single retained bridge is the shared data/lifecycle runtime, also used by compatibility tools.
final class RFNativeHostController: UIViewController {
    let bridgeController: MainViewController
    let model: RFAppModel
    private var hosting: UIHostingController<RFRootView>!
    init(bridge: MainViewController) {
        bridgeController = bridge; model = bridge.nativeAppModel
        super.init(nibName: nil, bundle: nil)
        model.bridge = bridge; model.owner = self
    }
    required init?(coder: NSCoder) { fatalError("Use init(bridge:)") }
    override func viewDidLoad() {
        super.viewDidLoad()
        RFAppModel.mark("host viewDidLoad")
        view.backgroundColor = .systemBackground
        hosting = UIHostingController(rootView: RFRootView(model: model))
        addChild(hosting); view.addSubview(hosting.view); hosting.didMove(toParent: self)
        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([hosting.view.leadingAnchor.constraint(equalTo: view.leadingAnchor), hosting.view.trailingAnchor.constraint(equalTo: view.trailingAnchor), hosting.view.topAnchor.constraint(equalTo: view.topAnchor), hosting.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)])
        // Loading the bridge's view starts the WebView and every plugin on the main thread (about
        // 2.5 s). Done after SwiftUI's first frame, so Home (from the cache) is on screen first.
    }
    private var runtimeAttached = false
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !runtimeAttached else { return }
        runtimeAttached = true
        RFAppModel.log.notice("RFStartup native shell visible after \(Int(Date().timeIntervalSince(RFAppModel.launchedAt) * 1000)) ms")
        // Loading the bridge's view starts the WebView and every plugin on the main thread (about
        // 2.5 s). Done once the first frame is on screen, so Home (from the cache) appears first.
        // Wait until the render server has the frame (two display refreshes plus a margin), then load.
        DispatchQueue.main.async { [weak self] in self?.retainRuntime() }
    }
    func retainRuntime() {
        let child = bridgeController
        child.willMove(toParent: nil); child.view.removeFromSuperview(); child.removeFromParent()
        addChild(child); view.insertSubview(child.view, at: 0); child.didMove(toParent: self)
        child.view.frame = view.bounds; child.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        child.view.alpha = 0.001; child.view.isUserInteractionEnabled = false; child.view.accessibilityElementsHidden = true
    }
}

private struct RFOriginalView: UIViewControllerRepresentable {
    @ObservedObject var model: RFAppModel
    func makeUIViewController(context: Context) -> UIViewController {
        let host = UIViewController()
        guard let bridge = model.bridge else { return host }
        bridge.willMove(toParent: nil); bridge.view.removeFromSuperview(); bridge.removeFromParent()
        host.addChild(bridge); host.view.addSubview(bridge.view); bridge.didMove(toParent: host)
        bridge.view.frame = host.view.bounds; bridge.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        bridge.view.alpha = 1; bridge.view.isUserInteractionEnabled = true; bridge.view.accessibilityElementsHidden = false
        return host
    }
    func updateUIViewController(_ controller: UIViewController, context: Context) { }
    static func dismantleUIViewController(_ controller: UIViewController, coordinator: ()) {
        guard let bridge = controller.children.first as? MainViewController else { return }
        bridge.nativeAppModel.owner?.retainRuntime()
    }
}

struct RFRootView: View {
    @ObservedObject var model: RFAppModel
    var body: some View {
        Group {
            if model.ready {
                TabView(selection: $model.selected) {
                    Tab("Heute", systemImage: "house", value: "home") { NavigationStack { RFHomeView(model: model) } }.accessibilityIdentifier("redfit-tab-home")
                    Tab("Training", systemImage: "dumbbell", value: "training") { NavigationStack { RFTrainingView(model: model) } }.accessibilityIdentifier("redfit-tab-plan")
                    Tab("Ernährung", systemImage: "fork.knife", value: "nutrition") { NavigationStack { RFNutritionView(model: model) } }.accessibilityIdentifier("redfit-tab-nutrition")
                    Tab("Körper", systemImage: "figure", value: "body") { NavigationStack { RFBodyView(model: model) } }.accessibilityIdentifier("redfit-tab-stats")
                    Tab("Mehr", systemImage: "ellipsis", value: "more") { NavigationStack { RFMoreView(model: model) } }.accessibilityIdentifier("redfit-tab-more")
                }
                .tabBarMinimizeBehavior(.onScrollDown)
                .modifier(RFOptionalAccessory(model: model))
                .overlay(alignment: .top) {
                    if !model.live {
                        Label("Aktualisiere …", systemImage: "arrow.triangle.2.circlepath")
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 12).padding(.vertical, 6)
                            .glassEffect(.regular, in: .capsule)
                            .padding(.top, 2)
                            .transition(.move(edge: .top).combined(with: .opacity))
                            .accessibilityLabel("Daten werden aktualisiert")
                    }
                }
                .animation(.spring(response: 0.4, dampingFraction: 0.85), value: model.live)
            } else {
                VStack(spacing: 22) { Image("REDFitBrand").resizable().scaledToFit().frame(width: 150, height: 150).clipShape(.rect(cornerRadius: 30)); ProgressView("Lokale Daten werden geladen …") }
                    .frame(maxWidth: .infinity, maxHeight: .infinity).background(Color(.systemBackground))
            }
        }
        .tint(model.accent)
        .preferredColorScheme(model.data.string("theme") == "dark" ? .dark : model.data.string("theme") == "light" ? .light : nil)
        .sheet(isPresented: $model.originalVisible, onDismiss: { model.perform("refresh") }) {
            NavigationStack {
                RFOriginalView(model: model).ignoresSafeArea(edges: .bottom)
                    .navigationTitle(model.originalTitle).navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Fertig") { model.originalVisible = false } } }
            }.presentationDragIndicator(.visible)
        }
        .alert("RED Fit", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("Erneut sichern") { model.error = nil; model.perform("flush") }
            Button("OK") { model.error = nil }
        } message: { Text(model.error ?? "") }
    }
}

private struct RFOptionalAccessory: ViewModifier {
    @ObservedObject var model: RFAppModel
    @ViewBuilder func body(content: Content) -> some View {
        if #available(iOS 26.1, *) { content.tabViewBottomAccessory(isEnabled: model.hasActive) { RFWorkoutAccessory(model: model) } }
        else { content.tabViewBottomAccessory { if model.hasActive { RFWorkoutAccessory(model: model) } } }
    }
}

private struct RFWorkoutAccessory: View {
    @ObservedObject var model: RFAppModel
    @Environment(\.tabViewBottomAccessoryPlacement) var placement
    @State private var open = false
    @Namespace private var transition
    var body: some View {
        Button { open = true; model.perform("route", ["path": "/workout"]) } label: {
            HStack(spacing: 12) {
                Image(systemName: "dumbbell.fill").foregroundStyle(model.accent)
                VStack(alignment: .leading) { Text(model.active.string("name", "Training")).font(.subheadline.weight(.semibold)).lineLimit(1); if placement != .inline { Text("\(Int(model.active.number("done")))/\(Int(model.active.number("total"))) Sätze · Fortsetzen").font(.caption).foregroundStyle(.secondary) } }
                Spacer(minLength: 2)
                Image(systemName: "arrow.up.right")
            }.padding(.horizontal).padding(.vertical, 9).contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityIdentifier("redfit-active-workout")
            .matchedTransitionSource(id: "workout", in: transition)
            .fullScreenCover(isPresented: $open) { NavigationStack { RFWorkoutView(model: model) }.navigationTransition(.zoom(sourceID: "workout", in: transition)) }
    }
}

// The Home tab lives in REDFitHomeView.swift.

private struct RFTrainingView: View {
    @ObservedObject var model: RFAppModel
    @State private var edit: RFRecord?
    @State private var create = false
    @State private var workout = false
    var body: some View {
        List {
            Section {
                Button(model.hasActive ? "Training fortsetzen" : "Freies Training starten", systemImage: "play.fill") {
                    model.perform("start", ["routineIds": []]) { workout = true }
                }.frame(minHeight: 44)
                NavigationLink { RFExerciseLibrary(model: model) } label: { Label("Übungen entdecken", systemImage: "magnifyingglass") }
                NavigationLink { RFHistoryView(model: model) } label: { Label("Trainingsverlauf", systemImage: "clock.arrow.circlepath") }
            }
            Section("Deine Trainingspläne") {
                if model.data.records("routines").isEmpty { ContentUnavailableView("Dein erster Plan", systemImage: "list.bullet.clipboard", description: Text("Stelle deine Übungen zusammen oder starte ein freies Training.")) }
                ForEach(model.data.records("routines")) { routine in
                    VStack(alignment: .leading, spacing: 10) {
                        Button { edit = routine } label: { HStack { VStack(alignment: .leading) { Text(routine.string("name")).font(.headline); Text("\(routine.records("ex").count) Übungen").font(.subheadline).foregroundStyle(.secondary) }; Spacer(); Image(systemName: "chevron.right").foregroundStyle(.secondary) } }.buttonStyle(.plain)
                        Button("Plan trainieren", systemImage: "play.fill") { model.perform("start", ["routineIds": [routine.id]]) { workout = true } }.buttonStyle(.bordered).disabled(model.pending > 0)
                    }.padding(.vertical, 6)
                }
                Button("Plan erstellen", systemImage: "plus") { create = true }.frame(minHeight: 44)
            }
            Section("Weitere Trainingswerkzeuge") {
                Button("Wochenplan & Programme", systemImage: "calendar") { model.showOriginal("/plan", title: "Trainingsplanung") }
            }
        }.rfScreen().navigationTitle("Training").accessibilityIdentifier("redfit-native-training")
            .sheet(item: $edit) { RFRoutineEditor(model: model, routine: $0) }
            .sheet(isPresented: $create) { RFRoutineEditor(model: model, routine: RFRecord()) }
            .fullScreenCover(isPresented: $workout) { NavigationStack { RFWorkoutView(model: model) } }
    }
}

private struct RFRoutineEditor: View {
    @ObservedObject var model: RFAppModel
    let routine: RFRecord
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var exercises: [RFRecord] = []
    @State private var picker = false
    var body: some View {
        NavigationStack {
            List {
                Section("Name") { TextField("Zum Beispiel Oberkörper", text: $name).accessibilityIdentifier("redfit-plan-name") }
                Section {
                    ForEach(Array(exercises.enumerated()), id: \.offset) { index, exercise in Text(exercise.string("name", exercise.id)) }
                        .onDelete { exercises.remove(atOffsets: $0) }.onMove { exercises.move(fromOffsets: $0, toOffset: $1) }
                    Button("Übung hinzufügen", systemImage: "plus") { picker = true }
                } header: { HStack { Text("Übungen"); Spacer(); EditButton() } }
                if !routine.id.isEmpty { Section { Button("Satzvorgaben & Supersätze bearbeiten") { dismiss(); model.showOriginal("/plan/r/" + routine.id, title: name) } } }
            }.navigationTitle(routine.id.isEmpty ? "Neuer Trainingsplan" : "Plan bearbeiten").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) { Button("Speichern") { model.perform("routine", ["id": routine.id.isEmpty ? UUID().uuidString : routine.id, "name": name, "exerciseSlots": exercises.map { ["id": $0.id, "sourceIndex": $0.raw["nativeSlot"] as? Int ?? -1] }]) { dismiss() } }.accessibilityIdentifier("redfit-save-plan").disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || model.pending > 0) }
                }
                .sheet(isPresented: $picker) { NavigationStack { RFExerciseLibrary(model: model, pick: { exercises.append($0); picker = false }) } }
        }.onAppear { name = routine.string("name"); exercises = routine.records("exercises") }
    }
}

struct RFWorkoutView: View {
    @ObservedObject var model: RFAppModel
    @Environment(\.dismiss) var dismiss
    @State private var picker = false
    @State private var finish = false
    @State private var summary: RFRecord?
    var body: some View {
        List {
            if model.hasActive {
                Section {
                    TimelineView(.periodic(from: .now, by: 1)) { timeline in
                        LabeledContent("Trainingszeit", value: Duration.seconds(max(0, timeline.date.timeIntervalSince1970 - model.active.number("start") / 1000)).formatted(.time(pattern: .hourMinuteSecond)))
                    }
                    LabeledContent("Sätze", value: "\(Int(model.active.number("done"))) / \(Int(model.active.number("total")))")
                    RFRestTimer(model: model)
                }
                ForEach(Array(model.active.records("entries").enumerated()), id: \.offset) { index, entry in
                    Section {
                        ForEach(Array(entry.records("sets").enumerated()), id: \.offset) { setIndex, row in
                            if row.raw["sides"] is [String: Any] {
                                ForEach(["L", "R"], id: \.self) { side in RFSetRow(model: model, entry: index, setIndex: setIndex, row: row.record("sides").record(side), mode: entry.string("mode"), unit: entry.string("unit", model.data.string("unit")), side: side) }
                            } else { RFSetRow(model: model, entry: index, setIndex: setIndex, row: row, mode: entry.string("mode"), unit: entry.string("unit", model.data.string("unit"))) }
                        }
                        Button("Satz hinzufügen", systemImage: "plus") { model.workout("addSet", ["entry": index]) }.frame(minHeight: 44)
                    } header: { HStack { Text(entry.string("name")); if !entry.string("sg").isEmpty { Image(systemName: "link") } } }
                }
                Section {
                    Button("Übung hinzufügen", systemImage: "plus.circle") { picker = true }.frame(minHeight: 44)
                    Button("Training abschließen", systemImage: "checkmark.circle") { finish = true }.frame(minHeight: 44).accessibilityIdentifier("redfit-finish-workout")
                    Button("Alle Trainingswerkzeuge", systemImage: "slider.horizontal.3") { model.showOriginal("/workout", title: "Training") }
                }
            } else { ContentUnavailableView("Training gespeichert", systemImage: "checkmark.circle", description: Text("Du findest es im Trainingsverlauf.")); Button("Schließen") { dismiss() } }
        }.rfScreen().navigationTitle(model.active.string("name", "Training")).navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Minimieren", systemImage: "chevron.down") { dismiss() } } }
            .confirmationDialog("Training abschließen und alle erfassten Sätze speichern?", isPresented: $finish, titleVisibility: .visible) {
                Button("Abschließen und speichern") { model.perform("finish", ["workoutId": model.active.id]) { summary = model.data.records("workouts").first } }
                Button("Weiter trainieren", role: .cancel) { }
            }
            .sheet(item: $summary) { record in NavigationStack { RFWorkoutSummary(workout: record, unit: model.data.string("unit")) } }
            .sheet(isPresented: $picker) { NavigationStack { RFExerciseLibrary(model: model, pick: { ex in model.perform("addExercise", ["id": ex.id, "workoutId": model.active.id]) { picker = false } }) } }
    }
}

private struct RFSetRow: View {
    @ObservedObject var model: RFAppModel
    let entry: Int, setIndex: Int
    let row: RFRecord
    let mode: String, unit: String
    var side: String? = nil
    @State private var weight = ""
    @State private var amount = ""
    @FocusState private var focused: Bool
    /// Set while the done button saves, so losing focus does not save the same values a second time.
    @State private var toggling = false
    private var amountKey: String { mode == "time" ? "sec" : mode == "cardio" ? "min" : "r" }
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Satz \(setIndex + 1)" + (side == "L" ? " · links" : side == "R" ? " · rechts" : "") + (row.bool("warmup") ? " · Aufwärmen" : "")).font(.caption).foregroundStyle(.secondary)
            HStack(spacing: 12) {
                VStack(alignment: .leading) { Text(unit).font(.caption2).foregroundStyle(.secondary); TextField("Gewicht", text: $weight).keyboardType(.decimalPad).focused($focused).accessibilityLabel("Gewicht Satz \(setIndex + 1)") }.frame(maxWidth: .infinity)
                VStack(alignment: .leading) { Text(mode == "time" ? "Sekunden" : mode == "cardio" ? "Minuten" : "Wiederholungen").font(.caption2).foregroundStyle(.secondary); TextField("Anzahl", text: $amount).keyboardType(.decimalPad).focused($focused).accessibilityLabel("Anzahl Satz \(setIndex + 1)") }.frame(maxWidth: .infinity)
                Button { toggling = true; focused = false; save(toggle: true) } label: { Image(systemName: row.bool("done") ? "checkmark.circle.fill" : "circle").font(.title2).frame(width: 48, height: 48) }.buttonStyle(.borderless).disabled(model.pending > 0).accessibilityLabel(row.bool("done") ? "Satz zurücknehmen" : "Satz abschließen").accessibilityIdentifier("redfit-set-\(entry)-\(setIndex)-\(side ?? "both")")
            }.monospacedDigit()
            if !row.string("type").isEmpty && row.string("type") != "straight" { Text(row.string("type") == "dropset" ? "Dropsatz · Details in den Trainingswerkzeugen" : "Rest-Pause · Details in den Trainingswerkzeugen").font(.caption).foregroundStyle(.secondary) }
        }.padding(.vertical, 3)
            .onAppear { reset() }
            .onChange(of: row.number("w")) { _, _ in if !focused { reset() } }
            .onChange(of: row.number(amountKey)) { _, _ in if !focused { reset() } }
            .onChange(of: focused) { was, now in if was && !now && !toggling { save(toggle: false) } }
            .swipeActions { Button("Satz entfernen", role: .destructive) { model.workout("removeSet", ["entry": entry, "set": setIndex]) } }
    }
    private func reset() { weight = row.number("w").formatted(.number.precision(.fractionLength(0...2)).grouping(.never)); amount = row.number(amountKey).formatted(.number.precision(.fractionLength(0...2)).grouping(.never)) }
    private func save(toggle: Bool) {
        let w = Double(weight.replacingOccurrences(of: ",", with: ".")), n = Double(amount.replacingOccurrences(of: ",", with: "."))
        guard let w, let n, w.isFinite, n.isFinite, w >= 0, n >= 0 else { toggling = false; model.error = "Bitte gültige Zahlen eingeben."; return }
        var base: [String: Any] = ["workoutId": model.active.id, "entry": entry, "set": setIndex]
        if let side { base["side"] = side }
        Task {
            do {
                if w != row.number("w") { _ = try await model.request("workout", base.merging(["operation": "patch", "field": "w", "value": w]) { _, b in b }) }
                if n != row.number(amountKey) { _ = try await model.request("workout", base.merging(["operation": "patch", "field": amountKey, "value": n]) { _, b in b }) }
                if toggle { _ = try await model.request("workout", base.merging(["operation": "toggle"]) { _, b in b }) }
            } catch { model.error = error.localizedDescription }
            if toggle { toggling = false }
        }
    }
}

private struct RFRestTimer: View {
    @ObservedObject var model: RFAppModel
    var body: some View {
        if model.data.raw["timer"] is [String: Any] {
            let timer = model.data.record("timer")
            TimelineView(.periodic(from: .now, by: 1)) { timeline in
                let left = timer.bool("paused") ? timer.number("left") : max(0, timer.number("endsAt") / 1000 - timeline.date.timeIntervalSince1970)
                HStack {
                    Label(timer.bool("ready") || left == 0 ? "Pause beendet" : "Pause", systemImage: "timer")
                    Spacer(); Text(Duration.seconds(left).formatted(.time(pattern: .minuteSecond))).monospacedDigit()
                    Button(timer.bool("paused") ? "Fortsetzen" : "Pausieren", systemImage: timer.bool("paused") ? "play" : "pause") { model.perform("rest", ["operation": timer.bool("paused") ? "resume" : "pause"]) }.labelStyle(.iconOnly).frame(width: 44, height: 44).buttonStyle(.borderless)
                    Button("Pause beenden", systemImage: "xmark") { model.perform("rest", ["operation": "stop"]) }.labelStyle(.iconOnly).frame(width: 44, height: 44).buttonStyle(.borderless)
                }
            }
        }
    }
}

private struct RFExerciseLibrary: View {
    @ObservedObject var model: RFAppModel
    var muscle: String? = nil
    var pick: ((RFRecord) -> Void)? = nil
    @State private var query = ""
    @State private var items: [RFRecord] = []
    @State private var loading = false
    @State private var count = 0
    @State private var loadError: String?
    var body: some View {
        List {
            if loading && items.isEmpty { ProgressView("Übungen laden …") }
            if let loadError { Text(loadError).foregroundStyle(.red) }
            ForEach(items) { ex in
                if let pick { Button { pick(ex) } label: { row(ex) }.accessibilityIdentifier("redfit-exercise-" + ex.id) }
                else { NavigationLink { RFExerciseDetail(model: model, exercise: ex) } label: { row(ex) }.accessibilityIdentifier("redfit-exercise-" + ex.id) }
            }
            if !loading && items.isEmpty && loadError == nil { ContentUnavailableView.search(text: query) }
            if count > items.count { Text("\(count) Treffer · Suche verfeinern").font(.caption).foregroundStyle(.secondary) }
        }.rfScreen().navigationTitle("Übungen").searchable(text: $query, prompt: "Name oder Gerät")
            .task(id: query + (muscle ?? "")) {
                loading = true
                do {
                    try await Task.sleep(for: .milliseconds(query.isEmpty ? 0 : 180))
                    var payload: [String: Any] = ["query": query]; if let muscle { payload["muscle"] = muscle }
                    let result = try await model.request("search", payload)
                    guard !Task.isCancelled else { return }
                    items = (result["items"] as? [[String: Any]] ?? []).map(RFRecord.init); count = result["count"] as? Int ?? 0; loadError = nil
                } catch { if !Task.isCancelled { loadError = error.localizedDescription } }
                loading = false
            }
    }
    private func row(_ ex: RFRecord) -> some View { VStack(alignment: .leading, spacing: 5) { Text(ex.string("name")).foregroundStyle(.primary); Text(ex.string("equipment") + " · " + ex.string("target")).font(.caption).foregroundStyle(.secondary) }.frame(minHeight: 44) }
}

struct RFExerciseDetail: View {
    @ObservedObject var model: RFAppModel
    let exercise: RFRecord
    var body: some View {
        List {
            Section { RFExerciseMedia(exercise: exercise).frame(height: 300).listRowBackground(Color.black) }
            Section("Übung") { Text(exercise.string("name")).font(.headline); LabeledContent("Gerät", value: exercise.string("equipment")); LabeledContent("Zielmuskel", value: exercise.string("target")) }
            Section("Muskelgruppen") {
                ForEach(model.data.records("muscles").filter { exercise.record("muscles").number($0.id) > 0 }) { muscle in NavigationLink(muscle.string("name")) { RFExerciseLibrary(model: model, muscle: muscle.id) } }
            }
            if let type = RFMovement.forExercise(exercise.string("name")) {
                Section("3D-Bewegungsmuster") { RFRealityCoach(movement: type, selectedMuscle: .constant(nil)).frame(height: 320); Text("Schematische Bewegung. Die Übungsvorführung oben bleibt die Referenz.").font(.caption).foregroundStyle(.secondary) }
            }
            if model.hasActive { Button("Zum aktuellen Training hinzufügen", systemImage: "plus") { model.perform("addExercise", ["id": exercise.id, "workoutId": model.active.id]) } }
            Button("Anleitung & alle Übungsdetails") { model.showOriginal("/library", title: "Übungen") }
        }.navigationTitle(exercise.string("name")).navigationBarTitleDisplayMode(.inline)
    }
}

struct RFHistoryView: View {
    @ObservedObject var model: RFAppModel
    var body: some View {
        List {
            ForEach(model.data.records("workouts")) { w in NavigationLink { RFWorkoutSummary(workout: w, unit: model.data.string("unit")) } label: { VStack(alignment: .leading, spacing: 5) { Text(w.string("name")).font(.headline); Text(w.string("d") + " · " + w.number("volume").formatted() + " " + model.data.string("unit")).font(.subheadline).foregroundStyle(.secondary) } } }
            if model.data.records("workouts").isEmpty { ContentUnavailableView("Noch kein Training", systemImage: "clock", description: Text("Dein nächstes abgeschlossenes Training erscheint hier.")) }
            Button("Vollständiger Verlauf & Bearbeiten") { model.showOriginal("/history", title: "Verlauf") }
        }.rfScreen().navigationTitle("Verlauf")
    }
}

private struct RFWorkoutSummary: View {
    let workout: RFRecord
    let unit: String
    var body: some View {
        List {
            Section { LabeledContent("Datum", value: workout.string("d")); LabeledContent("Volumen", value: workout.number("volume", workout.number("vol")).formatted() + " " + unit); LabeledContent("Dauer", value: Duration.seconds(max(0, workout.number("end") - workout.number("start")) / 1000).formatted(.time(pattern: .hourMinute))) }
            ForEach(Array(workout.records("entries").enumerated()), id: \.offset) { _, entry in Section(entry.string("name", entry.id)) { ForEach(Array(entry.records("sets").enumerated()), id: \.offset) { i, set in HStack { Text("Satz \(i + 1)"); Spacer(); Text("\(set.number("w").formatted()) \(unit) × \(set.number("r").formatted())").monospacedDigit(); if set.bool("done") { Image(systemName: "checkmark").foregroundStyle(.green) } } } } }
            if !workout.string("note").isEmpty { Section("Notiz") { Text(workout.string("note")) } }
        }.navigationTitle(workout.string("name", "Training")).navigationBarTitleDisplayMode(.inline)
    }
}

// The Körper tab lives in REDFitBodyView.swift.

private struct RFMoreView: View {
    @ObservedObject var model: RFAppModel
    @AppStorage("redfit.displayName") private var displayName = ""
    var body: some View {
        List {
            Section { HStack(spacing: 16) { Image("REDFitBrand").resizable().frame(width: 64, height: 64).clipShape(.rect(cornerRadius: 15)); VStack(alignment: .leading, spacing: 5) { Text("RED Fit").font(.title2.weight(.semibold)); Text("Deine Daten bleiben auf deinem Gerät.").font(.caption).foregroundStyle(.secondary) } }.padding(.vertical, 8) }
            Section("Profil") { TextField("Dein Name für die Begrüßung", text: $displayName).textContentType(.givenName).accessibilityIdentifier("redfit-display-name") }
            Section("Darstellung") {
                Picker("Design", selection: setting("theme", fallback: "dark")) { Text("Dunkel").tag("dark"); Text("Hell").tag("light"); Text("System").tag("system") }
                Picker("Einheit", selection: setting("unit", fallback: "kg")) { Text("Kilogramm").tag("kg"); Text("Pfund").tag("lb") }
                Picker("Trainingsansicht", selection: setting("workoutView", fallback: "cards")) { Text("Karten").tag("cards"); Text("Liste").tag("list"); Text("Kompakt").tag("compact") }
                Toggle("Trainingsklänge", isOn: Binding(get: { model.data.bool("sound") }, set: { model.perform("settings", ["key": "sound", "value": $0]) }))
            }
            // Nutrition goals live in the Ernährung tab only; one place per setting.
            Section("Daten") { NavigationLink { RFBackupView(model: model) } label: { Label("Backup & Datenübernahme", systemImage: "externaldrive") } }
            Section {
                if RFGarminLink.available {
                    Button("Garmin-Uhr verbinden", systemImage: "applewatch.radiowaves.left.and.right") { RFGarminLink.shared.chooseDevices() }
                        .accessibilityIdentifier("redfit-garmin-connect")
                } else {
                    Label("Garmin-Uhr", systemImage: "applewatch.radiowaves.left.and.right").foregroundStyle(.secondary)
                }
            } header: { Text("Uhren") } footer: {
                Text(RFGarminLink.available
                     ? "Wählt deine Garmin-Uhr in Garmin Connect aus. Training und Sätze laufen dann zwischen Uhr und iPhone; die RED-Fit-App muss auf der Uhr installiert sein."
                     : "Die Garmin-Verbindung braucht Garmins Connect-IQ-SDK in diesem Build. Die Apple Watch funktioniert unabhängig davon.")
            }
            Section("Bestehende Werkzeuge") { Button("Alle Einstellungen & Integrationen", systemImage: "gearshape") { model.showOriginal("/settings", title: "Einstellungen") } }
            Section { Text("Version \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "") · Build \(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "")").font(.caption).foregroundStyle(.secondary) }
        }.rfScreen().navigationTitle("Mehr")
    }
    private func setting(_ key: String, fallback: String) -> Binding<String> { Binding(get: { model.data.string(key, fallback) }, set: { model.perform("settings", ["key": key, "value": $0]) }) }
}

private struct RFBackupView: View {
    @ObservedObject var model: RFAppModel
    @AppStorage("redfit.displayName") private var displayName = ""
    @State private var document: RFJSONDocument?
    @State private var exporting = false
    @State private var importing = false
    @State private var preview: RFRecord?
    var body: some View {
        List {
            Section("Sichern") {
                Button("Backup exportieren", systemImage: "square.and.arrow.up") { Task { do { let r = try await model.request("export", ["displayName": displayName]); document = RFJSONDocument(text: r["text"] as? String ?? ""); exporting = true } catch { model.error = error.localizedDescription } } }.disabled(model.pending > 0)
                Text("Training, Ernährung, Wasser, Ziele, Einkaufsliste und dein Begrüßungsname werden gemeinsam gesichert. Eigene Fotos und Videos lassen sich zusätzlich über die bestehenden Werkzeuge exportieren.").font(.footnote).foregroundStyle(.secondary)
                Button("Backup mit Fotos & Videos") { model.showOriginal("/settings/data", title: "Mediensicherung") }
            }
            Section("Übernehmen") {
                Button("Sicherung prüfen und importieren", systemImage: "square.and.arrow.down") { importing = true }.disabled(model.pending > 0)
                Text("Die bestehende openGym-App bleibt erhalten. Exportiere dort eine JSON-Sicherung und wähle sie hier aus. Der Import zeigt zuerst eine Vorschau und führt die Daten zusammen.").font(.footnote).foregroundStyle(.secondary)
            }
        }.rfScreen().navigationTitle("Backup")
            .fileExporter(isPresented: $exporting, document: document, contentType: .json, defaultFilename: "RED-Fit-Backup-" + model.data.string("date")) { result in if case .failure(let error) = result { model.error = error.localizedDescription } }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
                Task { do {
                    let url = try result.get(), scoped = url.startAccessingSecurityScopedResource(); defer { if scoped { url.stopAccessingSecurityScopedResource() } }
                    let data = try Data(contentsOf: url, options: .mappedIfSafe)
                    guard data.count <= 64 * 1024 * 1024, let text = String(data: data, encoding: .utf8) else { throw CocoaError(.fileReadCorruptFile) }
                    preview = RFRecord(try await model.request("previewImport", ["text": text]))
                } catch { model.error = error.localizedDescription } }
            }
            .sheet(item: $preview) { checked in NavigationStack { List { LabeledContent("Trainings", value: String(Int(checked.number("workouts")))); LabeledContent("Pläne", value: String(Int(checked.number("routines")))); LabeledContent("Mahlzeiten", value: String(Int(checked.number("meals")))); if !checked.string("displayName").isEmpty { LabeledContent("Begrüßungsname", value: checked.string("displayName")) }; Text("Vorhandene Daten werden zusammengeführt. Die Quelldatei und die alte App bleiben erhalten."); Button("Daten zusammenführen") { model.perform("import", ["token": checked.string("token")]) { if displayName.isEmpty { displayName = checked.string("displayName") }; preview = nil } }.disabled(model.pending > 0) }.navigationTitle("Importvorschau").toolbar { ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { preview = nil } } } } }
    }
}

private struct RFJSONDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var text: String
    init(text: String) { self.text = text }
    init(configuration: ReadConfiguration) throws { text = String(data: configuration.file.regularFileContents ?? Data(), encoding: .utf8) ?? "" }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper { FileWrapper(regularFileWithContents: Data(text.utf8)) }
}

/// The last native snapshot on disk, so Home appears at once on the next launch. It is a copy of
/// what the core already holds (no new data), lives in Application Support, is excluded from iCloud
/// backup like the rest of the app's files, and is replaced by the live state as soon as the core
/// answers.
enum RFSnapshotCache {
    private static var url: URL? {
        guard let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else { return nil }
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("redfit-native-snapshot.json")
    }
    static func load() -> [String: Any]? {
        guard let url, let data = try? Data(contentsOf: url),
              let raw = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              raw["ready"] as? Bool == true else { return nil }
        return raw
    }
    static func save(_ payload: [String: Any]) {
        guard var url, JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload) else { return }
        try? data.write(to: url, options: [.atomic, .completeFileProtection])
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? url.setResourceValues(values)
    }
}
