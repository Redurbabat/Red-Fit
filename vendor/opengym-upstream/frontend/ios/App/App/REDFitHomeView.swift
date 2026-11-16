import SwiftUI
import UIKit
import ImageIO
import PhotosUI

// Native Home ("Heute"). Calm dark cards, glass only on floating controls (RED Morph material
// hierarchy). Week, streak and the next workout come from the widget snapshot the bridge passes
// in `home.widget`, so Home and the Home Screen widgets always agree. Exercise animations are the
// existing local demonstrations (RFExerciseMedia); nothing here invents another animation system.

enum RFTheme {
    static let background = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.055, green: 0.067, blue: 0.086, alpha: 1) : .systemGroupedBackground })
    /// The same colour as the rows of every grouped list, so Home's cards and the other tabs match.
    static let card = Color(uiColor: .secondarySystemGroupedBackground)
    static let water = Color(red: 0.16, green: 0.45, blue: 1.0)
    static let radius: CGFloat = 28
}

extension View {
    /// Every native screen sits on RED Fit's background, so the tabs look like one app with Home.
    func rfScreen() -> some View {
        scrollContentBackground(.hidden).background(RFTheme.background.ignoresSafeArea())
    }
}

/// Shared motion: interruptible springs, calm at rest. With Reduce Motion only opacity changes.
enum RFMotion {
    static let spring = Animation.spring(response: 0.45, dampingFraction: 0.82)
    static let snappy = Animation.snappy(duration: 0.28)
}

/// Home's sections rise in once, one after another, the first time it appears.
private struct RFEntrance: ViewModifier {
    let index: Int
    let shown: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func body(content: Content) -> some View {
        content
            .opacity(shown ? 1 : 0)
            .offset(y: shown || reduceMotion ? 0 : 22)
            .scaleEffect(shown || reduceMotion ? 1 : 0.97, anchor: .top)
            .animation(reduceMotion ? .easeOut(duration: 0.2) : RFMotion.spring.delay(Double(index) * 0.07), value: shown)
    }
}

/// Cards answer a press by sinking slightly, the way system controls do.
struct RFPressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.965 : 1)
            .brightness(configuration.isPressed ? -0.04 : 0)
            .animation(RFMotion.snappy, value: configuration.isPressed)
    }
}

/// Days between two `yyyy-MM-dd` keys (b - a), nil for malformed input.
enum RFDates {
    static func date(_ key: String) -> Date? {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }
    static func days(from a: String, to b: String) -> Int? {
        guard let x = date(a), let y = date(b) else { return nil }
        return Calendar.current.dateComponents([.day], from: x, to: y).day
    }
}

struct RFHomeView: View {
    @ObservedObject var model: RFAppModel
    @AppStorage("redfit.displayName") private var displayName = ""
    @State private var openWorkout = false
    @State private var showHistory = false
    @State private var appeared = false
    @Namespace private var motion

    private var home: RFRecord { model.data.record("home") }
    private var widget: RFRecord { home.record("widget") }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 30) {
                RFHomeGreeting(name: displayName, widget: widget, today: model.data.string("date"), accent: model.accent)
                    .modifier(RFEntrance(index: 0, shown: appeared))
                RFProgressCard(model: model, widget: widget, photo: home.record("latestPhoto"))
                    .modifier(RFEntrance(index: 1, shown: appeared))
                RFNutritionSection(model: model)
                .modifier(RFEntrance(index: 2, shown: appeared))
                RFTodayWorkout(model: model, home: home, openWorkout: $openWorkout, motion: motion)
                    .modifier(RFEntrance(index: 3, shown: appeared))
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
        .background(RFTheme.background.ignoresSafeArea())
        .navigationTitle("RED Fit")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { model.selected = "training" } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "flame.fill").foregroundStyle(.orange)
                            .symbolEffect(.bounce, value: Int(widget.number("streak")))
                        Text("\(Int(widget.number("streak")))").font(.subheadline.weight(.bold)).monospacedDigit().contentTransition(.numericText())
                            .animation(RFMotion.spring, value: Int(widget.number("streak")))
                        FreezeFlakes(n: Int(widget.record("streakInfo").number("freezes")))
                    }
                }
                .accessibilityLabel("Serie: \(Int(widget.number("streak"))) Wochen")
                .accessibilityIdentifier("redfit-streak")
                Button("Verlauf", systemImage: "calendar") { showHistory = true }.accessibilityIdentifier("redfit-history")
            }
        }
        .sheet(isPresented: $showHistory) {
            NavigationStack { RFHistoryView(model: model).toolbar { ToolbarItem(placement: .confirmationAction) { Button("Fertig") { showHistory = false } } } }
        }
        .fullScreenCover(isPresented: $openWorkout) {
            NavigationStack { RFWorkoutView(model: model) }.navigationTransition(.zoom(sourceID: "workout-start", in: motion))
        }
        .onAppear { appeared = true }
        .accessibilityIdentifier("redfit-native-home")
    }
}

// MARK: - greeting

private struct RFHomeGreeting: View {
    let name: String
    let widget: RFRecord
    let today: String
    let accent: Color
    var body: some View {
        let daysLeft = max(1, RFDates.days(from: today, to: widget.string("weekUntil")) ?? 7)
        VStack(alignment: .leading, spacing: 10) {
            Text(name.isEmpty ? "Hi" : "Hi \(name)")
                .font(.system(.largeTitle, design: .rounded).weight(.bold))
                .lineLimit(1).minimumScaleFactor(0.6)
                .accessibilityIdentifier("redfit-home-greeting")
            HStack(spacing: 12) {
                ProgressBar(value: Double(8 - min(7, daysLeft)) / 7, accent: accent).frame(width: 150)
                    .animation(RFMotion.spring, value: daysLeft)
                Text(daysLeft == 1 ? "Letzter Tag der Woche" : "\(daysLeft) T übrig").font(.subheadline).foregroundStyle(.secondary)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Woche: noch \(daysLeft) Tage")
        }
        .padding(.top, 4)
    }
}

// MARK: - progress photo and weekly goal

private struct RFProgressCard: View {
    @ObservedObject var model: RFAppModel
    let widget: RFRecord
    let photo: RFRecord

    private var goal: (done: Int, of: Int)? {
        let left = widget.record("weekLeft")
        if left.number("of") > 0 { return (Int(left.number("of") - left.number("left")), Int(left.number("of"))) }
        let week = widget.record("week")
        if week.number("planned") > 0 { return (Int(week.number("done")), Int(week.number("planned"))) }
        return nil
    }

    var body: some View {
        HStack(spacing: 0) {
            RFProgressPhotoTile(model: model, photo: photo)

            VStack(alignment: .leading, spacing: 6) {
                if let goal {
                    Text("\(Int((Double(goal.done) / Double(max(1, goal.of)) * 100).rounded()))%")
                        .font(.system(size: 54, weight: .bold, design: .rounded))
                        .foregroundStyle(LinearGradient(colors: [.primary, .primary.opacity(0.6)], startPoint: .top, endPoint: .bottom))
                        .monospacedDigit().contentTransition(.numericText()).lineLimit(1).minimumScaleFactor(0.6)
                        .animation(RFMotion.spring, value: goal.done)
                    Text("Wochenziel · \(goal.done) von \(goal.of)").font(.caption).foregroundStyle(.secondary)
                } else {
                    Text("\(Int(widget.record("week").number("done")))")
                        .font(.system(size: 54, weight: .bold, design: .rounded)).monospacedDigit().contentTransition(.numericText())
                    Text("Trainings diese Woche").font(.caption).foregroundStyle(.secondary)
                }
                Spacer(minLength: 8)
                RFCheckInCountdown(until: widget.string("weekUntil"), accent: model.accent)
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("redfit-weekly-goal")
        }
        .frame(height: 170)
        .background(RFTheme.card, in: .rect(cornerRadius: RFTheme.radius))
    }
}

/// The newest progress photo with its menu: take one, pick one, or open all photos and the
/// existing comparison. Used on Home and in Körper.
struct RFProgressPhotoTile: View {
    @ObservedObject var model: RFAppModel
    let photo: RFRecord
    /// A Menu label gets no size from outside, so the tile sets its own and clips the photo to it.
    var size = CGSize(width: 150, height: 170)
    @State private var image: UIImage?
    @State private var showLibrary = false
    @State private var showCamera = false
    @State private var picked: PhotosPickerItem?
    @State private var saving = false

    var body: some View {
        Menu {
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                Button("Foto aufnehmen", systemImage: "camera") { showCamera = true }
            }
            Button("Aus Fotos wählen", systemImage: "photo.on.rectangle") { showLibrary = true }
            Divider()
            Button("Alle Fotos & Vergleich", systemImage: "square.split.2x1") { model.showOriginal("/progress-photos", title: "Fortschrittsfotos") }
        } label: {
            ZStack(alignment: .bottomLeading) {
                if let image { Image(uiImage: image).resizable().scaledToFill().transition(.opacity.combined(with: .scale(scale: 1.04))) }
                else { Image("REDFitBrand").resizable().scaledToFill() }
                Label(image == nil ? "Foto" : RFDates.date(photo.string("d"))?.formatted(.dateTime.day().month(.abbreviated)) ?? "",
                      systemImage: image == nil ? "plus" : "camera.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(.black.opacity(0.5), in: .capsule)
                    .background(.ultraThinMaterial, in: .capsule)
                    .padding(10)
                if saving {
                    ProgressView().controlSize(.large).frame(maxWidth: .infinity, maxHeight: .infinity).background(.black.opacity(0.35))
                        .transition(.opacity)
                }
            }
            .animation(RFMotion.spring, value: saving)
            .frame(width: size.width, height: size.height)
            .clipShape(.rect(cornerRadius: RFTheme.radius))
            .contentShape(.rect(cornerRadius: RFTheme.radius))
        }
        .buttonStyle(RFPressStyle())
        .disabled(saving)
        .accessibilityLabel(image == nil ? "Fortschrittsfoto hinzufügen" : "Fortschrittsfotos")
        .accessibilityIdentifier("redfit-progress-photo")
        .task(id: photo.string("hash")) { await loadPhoto() }
        .photosPicker(isPresented: $showLibrary, selection: $picked, matching: .images, preferredItemEncoding: .compatible)
        .onChange(of: picked) { _, item in
            guard let item else { return }
            picked = nil
            Task {
                if let data = try? await item.loadTransferable(type: Data.self), let picture = UIImage(data: data) { await save(picture) }
            }
        }
        .fullScreenCover(isPresented: $showCamera) {
            RFCameraPicker { picture in Task { await save(picture) } }.ignoresSafeArea()
        }
    }

    /// Hands the photo to the original core (bridge `addPhoto`): stored locally, filed under today.
    private func save(_ picture: UIImage) async {
        saving = true
        defer { saving = false }
        let jpeg = await Task.detached(priority: .userInitiated) { RFPhotoEncoding.jpeg(picture) }.value
        guard let jpeg else { model.error = "Das Foto konnte nicht gelesen werden."; return }
        do { _ = try await model.request("addPhoto", ["jpeg": jpeg.base64EncodedString(), "date": model.data.string("date")]) }
        catch { model.error = error.localizedDescription }
    }

    private func loadPhoto() async {
        let hash = photo.string("hash")
        guard !hash.isEmpty else { image = nil; return }
        guard let result = try? await model.request("photoThumb", ["hash": hash]),
              let url = result["dataURL"] as? String, let comma = url.firstIndex(of: ","),
              let data = Data(base64Encoded: String(url[url.index(after: comma)...])) else { return }
        withAnimation(RFMotion.spring) { image = UIImage(data: data) }
    }
}

/// Photos go to the core as JPEG, at most 2048 px on the long side (the core's own ingest limits again).
enum RFPhotoEncoding {
    static func jpeg(_ image: UIImage, edge: CGFloat = 2048) -> Data? {
        let scale = min(1, edge / max(image.size.width, image.size.height))
        let size = CGSize(width: (image.size.width * scale).rounded(), height: (image.size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let drawn = UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
        return drawn.jpegData(compressionQuality: 0.85)
    }
}

/// The system camera for one progress photo.
struct RFCameraPicker: UIViewControllerRepresentable {
    let done: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraDevice = .front
        picker.delegate = context.coordinator
        return picker
    }
    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator(self) }
    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: RFCameraPicker
        init(_ parent: RFCameraPicker) { self.parent = parent }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage { parent.done(image) }
            parent.dismiss()
        }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}

/// "Nächster Check-in": time left until the week ends, as a bar and a short countdown.
private struct RFCheckInCountdown: View {
    let until: String
    let accent: Color
    var body: some View {
        TimelineView(.periodic(from: .now, by: 60)) { context in
            let end = RFDates.date(until) ?? context.date.addingTimeInterval(7 * 86400)
            let left = max(0, end.timeIntervalSince(context.date))
            let days = Int(left / 86400), hours = Int(left.truncatingRemainder(dividingBy: 86400) / 3600), minutes = Int(left.truncatingRemainder(dividingBy: 3600) / 60)
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Check-in").font(.subheadline).foregroundStyle(.secondary)
                    Spacer()
                    Text(days > 0 ? "\(days) T \(hours) h" : "\(hours) h \(minutes) m").font(.subheadline).monospacedDigit().foregroundStyle(.secondary)
                }
                ProgressBar(value: 1 - left / (7 * 86400), accent: .primary.opacity(0.85))
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Nächster Check-in in \(days) Tagen und \(hours) Stunden")
        }
    }
}

// MARK: - water

/// The left half of "Ernährung": the water bottle, or (swiped left) today's meals with pictures.
/// "Ernährung" on Home: page 1 is the bottle with today's meals card, page 2 (swipe the bottle
/// left) is today's meals with pictures next to the week calendar. Both halves change together.
private struct RFNutritionSection: View {
    @ObservedObject var model: RFAppModel
    @State private var page = 0
    @Namespace private var glass
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private func go(_ to: Int) {
        withAnimation(reduceMotion ? .easeInOut(duration: 0.2) : .spring(response: 0.55, dampingFraction: 0.82)) { page = to }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(page == 0 ? "Ernährung" : "Mahlzeiten & Woche")
                    .font(.title3.weight(.semibold)).accessibilityAddTraits(.isHeader)
                    .contentTransition(.opacity)
                Spacer()
                GlassEffectContainer(spacing: 6) {
                    HStack(spacing: 6) {
                        ForEach(0..<2, id: \.self) { i in
                            Button { go(i) } label: {
                                Image(systemName: i == 0 ? "drop.fill" : "calendar")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(i == page ? Color.primary : Color.secondary)
                                    .frame(width: 36, height: 30)
                            }
                            .buttonStyle(.plain)
                            .glassEffect(i == page ? .regular.interactive() : .identity, in: .capsule)
                            .glassEffectID(i == page ? "page" : "page-\(i)", in: glass)
                            .accessibilityLabel(i == 0 ? "Wasser und Mahlzeiten" : "Mahlzeitenbilder und Woche")
                            .accessibilityAddTraits(i == page ? .isSelected : [])
                        }
                    }
                }
            }
            HStack(alignment: .center, spacing: 14) {
                RFWaterPanel(model: model, page: page, go: go).frame(maxWidth: .infinity)
                ZStack {
                    if page == 0 {
                        RFMealsCard(model: model)
                            .transition(AnyTransition(.blurReplace).combined(with: .scale(scale: 0.94)))
                    } else {
                        RFNutritionWeek(model: model)
                            .transition(AnyTransition(.blurReplace).combined(with: .scale(scale: 0.94)))
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}

private struct RFWaterPanel: View {
    @ObservedObject var model: RFAppModel
    let page: Int
    let go: (Int) -> Void

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                if page == 0 {
                    RFWaterBottle(model: model, onSwipe: { go(1) })
                        .transition(.asymmetric(insertion: .move(edge: .leading).combined(with: .opacity),
                                                removal: .move(edge: .leading).combined(with: .opacity)))
                } else {
                    RFMealPhotoStack(model: model)
                        .gesture(DragGesture(minimumDistance: 20).onEnded { v in
                            if v.translation.width > 40, abs(v.translation.width) > abs(v.translation.height) { go(0) }
                        })
                        .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity),
                                                removal: .move(edge: .trailing).combined(with: .opacity)))
                }
            }
            .frame(height: 200)
        }
    }
}

/// This week as a calendar: per day a calorie ring against the goal and how much water, today
/// marked. On glass, so it reads as the second face of the meals card.
private struct RFNutritionWeek: View {
    @ObservedObject var model: RFAppModel

    private var days: [(key: String, date: Date)] {
        let cal = Calendar(identifier: .iso8601)
        guard let start = cal.dateInterval(of: .weekOfYear, for: .now)?.start else { return [] }
        return (0..<7).compactMap { cal.date(byAdding: .day, value: $0, to: start) }.map { (RFDay.key($0), $0) }
    }

    var body: some View {
        let today = model.data.string("date")
        let goal = model.data.record("goal")
        let kcalGoal = goal.number("kcal"), waterGoal = max(250, goal.number("water", 2500))
        let entries = model.data.record("nutrition").records("entries")
        let water = model.data.record("extras").records("water")
        VStack(alignment: .leading, spacing: 10) {
            Text(Date.now.formatted(.dateTime.month(.wide).year())).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 4), spacing: 10) {
                ForEach(days, id: \.key) { day in
                    let kcal = entries.filter { $0.string("date") == day.key }.reduce(0) { $0 + $1.number("kcal") }
                    let ml = water.filter { $0.string("date") == day.key }.reduce(0) { $0 + $1.number("ml") }
                    let isToday = day.key == today
                    VStack(spacing: 3) {
                        Text(day.date.formatted(.dateTime.weekday(.narrow))).font(.caption2.weight(isToday ? .bold : .regular))
                            .foregroundStyle(isToday ? Color.primary : Color.secondary)
                        ZStack {
                            RFRing(value: kcalGoal > 0 ? kcal / kcalGoal : (kcal > 0 ? 1 : 0), color: .green, lineWidth: 4)
                            Circle().inset(by: 8).trim(from: 0, to: min(1, ml / waterGoal))
                                .stroke(RFTheme.water, style: StrokeStyle(lineWidth: 3, lineCap: .round)).rotationEffect(.degrees(-90))
                        }
                        .frame(width: 32, height: 32)
                    }
                    .padding(.vertical, 2)
                    .background(isToday ? Color.primary.opacity(0.08) : .clear, in: .rect(cornerRadius: 10))
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("\(day.date.formatted(.dateTime.weekday(.wide))): \(Int(kcal)) Kilokalorien, \(Int(ml)) Milliliter Wasser")
                }
            }
            HStack(spacing: 10) {
                Label("kcal", systemImage: "circle").foregroundStyle(.green)
                Label("Wasser", systemImage: "circle").foregroundStyle(RFTheme.water)
            }
            .font(.caption2).labelStyle(.titleAndIcon)
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 200, alignment: .topLeading)
        .glassEffect(.regular, in: .rect(cornerRadius: RFTheme.radius))
        .onTapGesture { model.selected = "nutrition" }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("redfit-nutrition-week")
    }
}

private struct RFWaterBottle: View {
    @ObservedObject var model: RFAppModel
    var onSwipe: () -> Void = {}
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var phase
    /// The last entry added here, offered for undo for a few seconds.
    @State private var lastAdded: (id: String, ml: Int)?
    @State private var undoTask: Task<Void, Never>?
    /// While a finger drags the water level: the amount it points at.
    @State private var dragML: Double?
    @State private var dragStart: Double = 0
    @State private var dragAxis: Axis?
    @State private var showGoal = false

    private static let bottleHeight: CGFloat = 200
    private var ml: Double { model.data.number("waterToday") }
    private var goal: Double { max(250, model.data.record("goal").number("water", 2500)) }
    private var shownML: Double { dragML ?? ml }

    private func add(_ amount: Int) {
        let id = UUID().uuidString
        model.perform("water", ["id": id, "date": model.data.string("date"), "ml": amount])
        offerUndo(id, amount)
    }

    private func offerUndo(_ id: String, _ amount: Int) {
        withAnimation(RFMotion.spring) { lastAdded = (id, amount) }
        undoTask?.cancel()
        undoTask = Task { try? await Task.sleep(for: .seconds(8)); if !Task.isCancelled { withAnimation(RFMotion.spring) { lastAdded = nil } } }
    }

    private func undo() {
        guard let last = lastAdded else { return }
        model.perform("removeWater", ["id": last.id])
        undoTask?.cancel()
        withAnimation(RFMotion.spring) { lastAdded = nil }
    }

    /// Sets today's total to `target` with the existing actions: more is one new entry, less removes
    /// the newest entries and adds back what was taken too much. Nothing else is rewritten.
    private func setTotal(_ target: Double) {
        let today = model.data.string("date")
        let diff = Int(target.rounded()) - Int(ml.rounded())
        guard diff != 0 else { return }
        if diff > 0 { add(diff); return }
        let entries = model.data.record("extras").records("water").filter { $0.string("date") == today }
        Task {
            do {
                var left = -diff
                for entry in entries.reversed() where left > 0 {
                    _ = try await model.request("removeWater", ["id": entry.id])
                    left -= Int(entry.number("ml"))
                }
                if left < 0 {
                    _ = try await model.request("water", ["id": UUID().uuidString, "date": today, "ml": -left])
                }
            } catch { model.error = error.localizedDescription }
        }
    }

    private var bottleGesture: some Gesture {
        LongPressGesture(minimumDuration: 0.5)
            .onEnded { _ in showGoal = true }
            .exclusively(before: DragGesture(minimumDistance: 8)
                .onChanged { value in
                    if dragAxis == nil {
                        dragAxis = abs(value.translation.width) > abs(value.translation.height) ? .horizontal : .vertical
                        dragStart = ml
                    }
                    guard dragAxis == .vertical else { return }
                    let perPoint = goal / (Self.bottleHeight * 0.9)
                    let raw = dragStart - value.translation.height * perPoint
                    dragML = min(goal * 1.5, max(0, (raw / 50).rounded() * 50))
                }
                .onEnded { value in
                    if dragAxis == .horizontal, value.translation.width < -40 { onSwipe() }
                    else if dragAxis == .vertical, let target = dragML { setTotal(target) }
                    dragAxis = nil
                    withAnimation(RFMotion.spring) { dragML = nil }
                })
    }

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            ZStack {
                RFBottleShape().fill(Color.black.opacity(0.85))
                TimelineView(.animation(minimumInterval: 1 / 30, paused: reduceMotion || phase != .active)) { context in
                    let t = reduceMotion ? 0 : context.date.timeIntervalSinceReferenceDate
                    RFWaterFill(level: min(1, shownML / goal), phase: t)
                        .fill(LinearGradient(colors: [RFTheme.water.opacity(0.75), RFTheme.water], startPoint: .top, endPoint: .bottom))
                }
                .clipShape(RFBottleShape())
                .animation(reduceMotion ? nil : (dragML == nil ? .spring(duration: 0.6) : .interactiveSpring), value: shownML)
                RFBottleShape().stroke(.white.opacity(dragML == nil ? 0.18 : 0.6), lineWidth: dragML == nil ? 1.5 : 2.5)
                VStack(spacing: 2) {
                    Text(dragML == nil
                         ? String(format: "%.1f l", goal / 1000).replacingOccurrences(of: ".", with: ",")
                         : "\(Int(shownML)) ml")
                        .font(.system(dragML == nil ? .title2 : .headline, design: .rounded).weight(.bold))
                        .foregroundStyle(.white.opacity(dragML == nil ? 0.35 : 0.95))
                        .contentTransition(.numericText())
                        .monospacedDigit()
                }
                .offset(y: 10)
            }
            .frame(width: 78, height: Self.bottleHeight)
            .contentShape(RFBottleShape())
            .gesture(bottleGesture)
            .sensoryFeedback(.selection, trigger: Int(shownML / 250))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Wasser heute: \(Int(ml)) von \(Int(goal)) Milliliter")
            .accessibilityHint("Nach oben oder unten ziehen ändert die Menge, gedrückt halten ändert das Ziel")
            .accessibilityAddTraits(.isStaticText)
            .accessibilityValue(String(Int(ml)))
            .accessibilityAdjustableAction { direction in
                switch direction {
                case .increment: add(250)
                case .decrement: setTotal(max(0, ml - 250))
                @unknown default: break
                }
            }
            .accessibilityAction(named: "Wasserziel ändern") { showGoal = true }
            .accessibilityIdentifier("redfit-water-total")

            VStack(spacing: 10) {
                Button { add(250) } label: {
                    Image(systemName: "drop.fill").font(.title2).foregroundStyle(RFTheme.water).frame(width: 56, height: 56)
                        .symbolEffect(.bounce.down, value: ml)
                }
                .glassEffect(.regular.interactive(), in: .circle)
                .contextMenu {
                    ForEach([150, 330, 500, 750], id: \.self) { amount in
                        Button("\(amount) ml", systemImage: amount >= 500 ? "waterbottle" : "cup.and.saucer") { add(amount) }
                    }
                    Button("Wasserziel ändern", systemImage: "target") { showGoal = true }
                    if lastAdded != nil { Button("Rückgängig", systemImage: "arrow.uturn.backward", role: .destructive) { undo() } }
                }
                .accessibilityLabel("250 ml hinzufügen")
                .accessibilityHint("Lange drücken für andere Mengen")
                .accessibilityIdentifier("redfit-add-water")
                .sensoryFeedback(.increase, trigger: ml)

                // The slot is always there, so the drop button never moves under a finger.
                Button(action: undo) {
                    VStack(spacing: 2) {
                        Image(systemName: "arrow.uturn.backward").font(.caption.weight(.bold))
                        Text("\(lastAdded?.ml ?? 0)").font(.caption2.weight(.semibold)).monospacedDigit()
                    }
                    .frame(width: 44, height: 44)
                }
                .buttonStyle(RFPressStyle())
                .glassEffect(.regular.interactive(), in: .circle)
                .scaleEffect(lastAdded == nil ? 0.6 : 1)
                .opacity(lastAdded == nil ? 0 : 1)
                .allowsHitTesting(lastAdded != nil)
                .accessibilityHidden(lastAdded == nil)
                .accessibilityLabel("\(lastAdded?.ml ?? 0) ml rückgängig")
                .accessibilityIdentifier("redfit-undo-water")
            }
            .frame(width: 60)
        }
        .sheet(isPresented: $showGoal) {
            RFWaterGoalSheet(model: model, current: goal).presentationDetents([.height(320)])
        }
    }
}

/// Changes only the water target of today's goals; calories and macros stay as they are.
private struct RFWaterGoalSheet: View {
    @ObservedObject var model: RFAppModel
    @State var current: Double
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 22) {
                Text("\(Int(current)) ml")
                    .font(.system(size: 48, weight: .bold, design: .rounded)).monospacedDigit()
                    .contentTransition(.numericText())
                    .animation(.snappy, value: current)
                Slider(value: $current, in: 500...5000, step: 250) {
                    Text("Wasserziel")
                } minimumValueLabel: { Text("0,5 l").font(.caption) } maximumValueLabel: { Text("5 l").font(.caption) }
                    .tint(RFTheme.water)
                    .sensoryFeedback(.selection, trigger: current)
                HStack {
                    ForEach([1500.0, 2000, 2500, 3000], id: \.self) { preset in
                        Button(String(format: "%.1f l", preset / 1000).replacingOccurrences(of: ".", with: ",")) { current = preset }
                            .buttonStyle(.glass)
                    }
                }
            }
            .padding(24)
            .navigationTitle("Wasserziel").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Sichern") {
                        let goal = model.data.record("goal")
                        model.perform("goals", ["id": UUID().uuidString, "date": model.data.string("date"),
                                                "kcal": goal.number("kcal"), "protein": goal.number("protein"),
                                                "carbs": goal.number("carbs"), "fat": goal.number("fat"),
                                                "water": current]) { dismiss() }
                    }
                    .accessibilityIdentifier("redfit-save-water-goal")
                }
            }
        }
    }
}

/// Today's meals as picture cards, one under the other. With nothing logged yet it shows the
/// three main meals as suggestions, so the page is never empty.
private struct RFMealPhotoStack: View {
    @ObservedObject var model: RFAppModel
    static let order = ["Frühstück", "Mittagessen", "Abendessen", "Snack"]

    var body: some View {
        let today = model.data.string("date")
        let entries = model.data.record("nutrition").records("entries").filter { $0.string("date") == today }
        let logged = Self.order.filter { type in entries.contains { $0.string("mealType") == type } }
        let shown = logged.isEmpty ? Array(Self.order.prefix(3)) : logged
        ScrollView {
            VStack(spacing: 8) {
                ForEach(shown, id: \.self) { type in
                    let items = entries.filter { $0.string("mealType") == type }
                    Button { model.selected = "nutrition" } label: {
                        HStack(spacing: 10) {
                            RFMealImage(type: type).frame(width: 52, height: 52).clipShape(.rect(cornerRadius: 14))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(type).font(.subheadline.weight(.semibold)).lineLimit(1)
                                Text(items.isEmpty ? "Tippen zum Erfassen" : items.map { $0.string("foodName") }.joined(separator: ", "))
                                    .font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                                if !items.isEmpty {
                                    Text("\(Int(items.reduce(0) { $0 + $1.number("kcal") })) kcal").font(.caption2.weight(.semibold)).monospacedDigit()
                                }
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(8)
                        .background(RFTheme.card, in: .rect(cornerRadius: 18))
                        .opacity(items.isEmpty ? 0.85 : 1)
                    }
                    .buttonStyle(RFPressStyle())
                    .accessibilityLabel(type + (items.isEmpty ? ", noch nichts erfasst" : ", \(items.count) Einträge"))
                }
            }
        }
        .scrollIndicators(.hidden)
        .accessibilityIdentifier("redfit-meal-photos")
    }
}

/// A picture for a meal: the bundled food photo (Assets "RFMeal-…") or, without one, a calm
/// gradient with a symbol.
struct RFMealImage: View {
    let type: String
    private var key: String {
        switch type { case "Frühstück": "breakfast"; case "Mittagessen": "lunch"; case "Abendessen": "dinner"; default: "snack" }
    }
    var body: some View {
        if let image = UIImage(named: "RFMeal-" + key) {
            Image(uiImage: image).resizable().scaledToFill()
        } else {
            let (symbol, colors): (String, [Color]) = switch key {
            case "breakfast": ("cup.and.saucer.fill", [.yellow, .orange])
            case "lunch": ("fork.knife", [.orange, .red])
            case "dinner": ("carrot.fill", [.green, .teal])
            default: ("leaf.fill", [.mint, .green])
            }
            ZStack {
                LinearGradient(colors: colors.map { $0.opacity(0.85) }, startPoint: .topLeading, endPoint: .bottomTrailing)
                Image(systemName: symbol).font(.title3).foregroundStyle(.white)
            }
        }
    }
}

private struct RFBottleShape: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        let neck = r.width * 0.42, capH = r.height * 0.1, shoulder = r.height * 0.2
        let neckX = r.midX - neck / 2
        p.addRoundedRect(in: CGRect(x: neckX, y: r.minY, width: neck, height: capH), cornerSize: CGSize(width: 8, height: 8))
        p.move(to: CGPoint(x: neckX, y: r.minY + capH))
        p.addLine(to: CGPoint(x: neckX + neck, y: r.minY + capH))
        p.addQuadCurve(to: CGPoint(x: r.maxX, y: r.minY + shoulder), control: CGPoint(x: r.maxX, y: r.minY + capH))
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY - 16))
        p.addQuadCurve(to: CGPoint(x: r.maxX - 16, y: r.maxY), control: CGPoint(x: r.maxX, y: r.maxY))
        p.addLine(to: CGPoint(x: r.minX + 16, y: r.maxY))
        p.addQuadCurve(to: CGPoint(x: r.minX, y: r.maxY - 16), control: CGPoint(x: r.minX, y: r.maxY))
        p.addLine(to: CGPoint(x: r.minX, y: r.minY + shoulder))
        p.addQuadCurve(to: CGPoint(x: neckX, y: r.minY + capH), control: CGPoint(x: r.minX, y: r.minY + capH))
        p.closeSubpath()
        return p
    }
}

private struct RFWaterFill: Shape {
    var level: Double
    var phase: Double
    var animatableData: Double { get { level } set { level = newValue } }
    func path(in r: CGRect) -> Path {
        var p = Path()
        guard level > 0 else { return p }
        // The cap (top tenth of the bottle) is never filled.
        let top = r.maxY - r.height * 0.9 * level
        let amp = level >= 1 ? 0 : 4.0
        p.move(to: CGPoint(x: r.minX, y: top))
        stride(from: 0.0, through: 1.0, by: 0.05).forEach { x in
            p.addLine(to: CGPoint(x: r.minX + r.width * x, y: top + sin(x * .pi * 2 + phase * 2.2) * amp))
        }
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
        p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        p.closeSubpath()
        return p
    }
}

// MARK: - meals

private struct RFMealsCard: View {
    @ObservedObject var model: RFAppModel
    private static let meals: [(type: String, symbol: String, tint: Color)] = [
        ("Frühstück", "cup.and.saucer.fill", .yellow), ("Mittagessen", "fork.knife", .orange), ("Abendessen", "carrot.fill", .green)]

    var body: some View {
        let today = model.data.string("date")
        let entries = model.data.record("nutrition").records("entries").filter { $0.string("date") == today }
        let kcal = model.data.record("totals").number("kcal")
        let goal = model.data.record("goal").number("kcal")
        Button { model.selected = "nutrition" } label: {
            VStack(spacing: 14) {
                Text("Mahlzeiten des Tages").font(.headline).multilineTextAlignment(.center).lineLimit(2).minimumScaleFactor(0.8)
                HStack(spacing: -16) {
                    ForEach(Self.meals, id: \.type) { meal in
                        let logged = entries.contains { $0.string("mealType") == meal.type }
                        RFMealImage(type: meal.type)
                            .frame(width: 56, height: 56)
                            .clipShape(.circle)
                            .overlay(Circle().stroke(Color.white.opacity(logged ? 0.9 : 0.25), lineWidth: 2))
                            .saturation(logged ? 1 : 0.35)
                            .opacity(logged ? 1 : 0.75)
                        .scaleEffect(logged ? 1 : 0.9)
                        .shadow(color: .black.opacity(logged ? 0.35 : 0.15), radius: 6, y: 3)
                        .animation(RFMotion.spring, value: logged)
                        .accessibilityHidden(true)
                    }
                }
                HStack(spacing: 6) {
                    Image(systemName: "leaf.fill").foregroundStyle(.green)
                    Text(goal > 0 ? "≈\(Int(kcal)) · \(Int((kcal / goal * 100).rounded())) %" : "≈\(Int(kcal)) kcal")
                        .font(.subheadline.weight(.semibold)).monospacedDigit().contentTransition(.numericText())
                        .animation(RFMotion.spring, value: Int(kcal))
                }
                .padding(.horizontal, 14).padding(.vertical, 8)
                .background(Color.primary.opacity(0.08), in: .capsule)
            }
            .padding(.vertical, 22).padding(.horizontal, 12)
            .frame(maxWidth: .infinity, minHeight: 200)
            .background(RFTheme.card, in: .rect(cornerRadius: RFTheme.radius))
        }
        .buttonStyle(RFPressStyle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Mahlzeiten des Tages: \(entries.count) Einträge, \(Int(kcal)) Kilokalorien")
        .accessibilityAddTraits(.isButton)
        .accessibilityHint("Öffnet die Ernährung")
        .accessibilityIdentifier("redfit-meals-card")
    }
}

// MARK: - today's workout

private struct RFTodayWorkout: View {
    @ObservedObject var model: RFAppModel
    let home: RFRecord
    @Binding var openWorkout: Bool
    let motion: Namespace.ID
    @State private var centered: String?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let plan = home.record("plan")
        let exercises = home.records("exercises")
        let shrink = !reduceMotion
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(model.hasActive ? "Laufendes Training" : plan.bool("today") ? "Heutiges Training" : plan.bool("planned") ? "Nächstes Training" : "Dein Training")
                        .font(.title3.weight(.semibold)).accessibilityAddTraits(.isHeader)
                    if !plan.string("name").isEmpty { Text(plan.string("name")).font(.subheadline).foregroundStyle(.secondary).lineLimit(1) }
                }
                Spacer()
                Button {
                    if model.hasActive { openWorkout = true; model.perform("route", ["path": "/workout"]) }
                    else {
                        model.perform("start", ["routineIds": (plan.raw["ids"] as? [String]) ?? []]) { openWorkout = true }
                    }
                } label: {
                    Label(model.hasActive ? "Fortsetzen" : "Starten", systemImage: "play.fill").font(.headline).frame(minHeight: 44).padding(.horizontal, 6)
                }
                .buttonStyle(.glass)
                .matchedTransitionSource(id: "workout-start", in: motion)
                .accessibilityIdentifier("redfit-start-workout")
            }
            if exercises.isEmpty {
                Button { model.selected = "training" } label: {
                    Label("Plan erstellen oder freies Training starten", systemImage: "list.bullet.clipboard")
                        .frame(maxWidth: .infinity, minHeight: 64)
                        .background(RFTheme.card, in: .rect(cornerRadius: RFTheme.radius))
                }.buttonStyle(RFPressStyle())
            } else {
                ScrollView(.horizontal) {
                    LazyHStack(spacing: 14) {
                        ForEach(Array(exercises.enumerated()), id: \.offset) { index, ex in
                            RFExerciseCard(model: model, entry: ex, animate: (centered ?? "0") == "\(index)", motion: motion, sourceID: "exercise-\(index)")
                                .id("\(index)")
                                .scrollTransition(.interactive, axis: .horizontal) { card, phase in
                                    card.scaleEffect(phase.isIdentity || !shrink ? 1 : 0.92)
                                        .opacity(phase.isIdentity ? 1 : 0.7)
                                }
                        }
                    }
                    .scrollTargetLayout()
                }
                .scrollTargetBehavior(.viewAligned)
                .scrollPosition(id: $centered, anchor: .leading)
                .scrollIndicators(.hidden)
                .contentMargins(.horizontal, 0)
                .accessibilityIdentifier("redfit-exercise-carousel")
            }
        }
    }
}

/// One exercise of the next workout. The card that is in front plays the existing local
/// demonstration (RFExerciseMedia); the others show its still picture, so only one clip runs.
private struct RFExerciseCard: View {
    @ObservedObject var model: RFAppModel
    let entry: RFRecord
    let animate: Bool
    let motion: Namespace.ID
    let sourceID: String
    @State private var record: RFRecord?
    @State private var still: UIImage?

    var body: some View {
        NavigationLink {
            Group { if let record { RFExerciseDetail(model: model, exercise: record) } else { ProgressView() } }
                .navigationTransition(.zoom(sourceID: sourceID, in: motion))
        } label: {
            ZStack(alignment: .top) {
                Group {
                    if animate, let record { RFExerciseMedia(exercise: record, controls: false).allowsHitTesting(false).transition(.opacity) }
                    else if let still { Image(uiImage: still).resizable().scaledToFill() }
                    else { Color.black.overlay { Image(systemName: "figure.strengthtraining.traditional").font(.largeTitle).foregroundStyle(.secondary) } }
                }
                .frame(width: 170, height: 230)
                .clipped()
                .animation(.easeInOut(duration: 0.35), value: animate)
                VStack {
                    HStack {
                        Spacer()
                        if !entry.string("line").isEmpty {
                            Text(entry.string("line")).font(.caption.weight(.semibold)).lineLimit(1)
                                .padding(.horizontal, 10).padding(.vertical, 6)
                                .glassEffect(.regular, in: .capsule)
                        }
                    }
                    Spacer()
                    Text(entry.string("name")).font(.subheadline.weight(.semibold)).foregroundStyle(.white).lineLimit(2)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(LinearGradient(colors: [.clear, .black.opacity(0.75)], startPoint: .top, endPoint: .bottom))
                }
                .padding(.top, 10).padding(.horizontal, 10)
            }
            .frame(width: 170, height: 230)
            .clipShape(.rect(cornerRadius: RFTheme.radius))
            .matchedTransitionSource(id: sourceID, in: motion)
        }
        .buttonStyle(RFPressStyle())
        .accessibilityLabel(entry.string("name") + (entry.string("line").isEmpty ? "" : ", " + entry.string("line")))
        .accessibilityIdentifier("redfit-home-exercise-" + entry.id)
        .task(id: entry.id) {
            guard record == nil, let result = try? await model.request("exercise", ["id": entry.id]),
                  let raw = result["exercise"] as? [String: Any] else { return }
            let r = RFRecord(raw)
            record = r
            still = await Task.detached(priority: .utility) { RFExerciseStill.load(r) }.value
        }
    }
}

/// The first frame of an exercise's existing local picture, small, for cards that are not playing.
enum RFExerciseStill {
    static func load(_ exercise: RFRecord) -> UIImage? {
        let clips = exercise.raw["clips"] as? [String] ?? []
        for source in [exercise.string("image")] + clips {
            guard let url = RFLocalMedia.url(source), !["mp4", "mov"].contains(url.pathExtension.lowercased()),
                  let src = CGImageSourceCreateWithURL(url as CFURL, nil) else { continue }
            let options: [CFString: Any] = [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceThumbnailMaxPixelSize: 360, kCGImageSourceCreateThumbnailWithTransform: true]
            if let cg = CGImageSourceCreateThumbnailAtIndex(src, 0, options as CFDictionary) { return UIImage(cgImage: cg) }
        }
        return nil
    }
}
