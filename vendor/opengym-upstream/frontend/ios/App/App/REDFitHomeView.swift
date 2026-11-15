import SwiftUI
import UIKit
import ImageIO

// Native Home ("Heute"). Calm dark cards, glass only on floating controls (RED Morph material
// hierarchy). Week, streak and the next workout come from the widget snapshot the bridge passes
// in `home.widget`, so Home and the Home Screen widgets always agree. Exercise animations are the
// existing local demonstrations (RFExerciseMedia); nothing here invents another animation system.

enum RFTheme {
    static let background = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.055, green: 0.067, blue: 0.086, alpha: 1) : .systemGroupedBackground })
    static let card = Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? UIColor(red: 0.11, green: 0.125, blue: 0.153, alpha: 1) : .secondarySystemGroupedBackground })
    static let water = Color(red: 0.16, green: 0.45, blue: 1.0)
    static let radius: CGFloat = 28
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
                VStack(alignment: .leading, spacing: 14) {
                    Text("Ernährung").font(.title3.weight(.semibold)).accessibilityAddTraits(.isHeader)
                    HStack(alignment: .center, spacing: 14) {
                        RFWaterBottle(model: model).frame(maxWidth: .infinity)
                        RFMealsCard(model: model).frame(maxWidth: .infinity)
                    }
                }
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
    @State private var image: UIImage?

    private var goal: (done: Int, of: Int)? {
        let left = widget.record("weekLeft")
        if left.number("of") > 0 { return (Int(left.number("of") - left.number("left")), Int(left.number("of"))) }
        let week = widget.record("week")
        if week.number("planned") > 0 { return (Int(week.number("done")), Int(week.number("planned"))) }
        return nil
    }

    var body: some View {
        HStack(spacing: 0) {
            Button { model.showOriginal("/progress-photos", title: "Fortschrittsfotos") } label: {
                ZStack(alignment: .bottomLeading) {
                    if let image { Image(uiImage: image).resizable().scaledToFill().transition(.opacity.combined(with: .scale(scale: 1.04))) }
                    else {
                        Image("REDFitBrand").resizable().scaledToFill()
                    }
                    Label(image == nil ? "Foto" : RFDates.date(photo.string("d"))?.formatted(.dateTime.day().month(.abbreviated)) ?? "",
                          systemImage: image == nil ? "plus" : "camera.fill")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .glassEffect(.regular, in: .capsule)
                        .padding(10)
                }
                .frame(width: 150, height: 170)
                .clipShape(.rect(cornerRadius: RFTheme.radius))
            }
            .buttonStyle(RFPressStyle())
            .accessibilityLabel(image == nil ? "Fortschrittsfoto hinzufügen" : "Fortschrittsfotos öffnen")
            .accessibilityIdentifier("redfit-progress-photo")

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
        .task(id: photo.string("hash")) { await loadPhoto() }
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

private struct RFWaterBottle: View {
    @ObservedObject var model: RFAppModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var phase

    private var ml: Double { model.data.number("waterToday") }
    private var goal: Double { max(250, model.data.record("goal").number("water", 2500)) }

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            ZStack {
                RFBottleShape().fill(Color.black.opacity(0.85))
                TimelineView(.animation(minimumInterval: 1 / 30, paused: reduceMotion || phase != .active)) { context in
                    let t = reduceMotion ? 0 : context.date.timeIntervalSinceReferenceDate
                    RFWaterFill(level: min(1, ml / goal), phase: t)
                        .fill(LinearGradient(colors: [RFTheme.water.opacity(0.75), RFTheme.water], startPoint: .top, endPoint: .bottom))
                }
                .clipShape(RFBottleShape())
                .animation(reduceMotion ? nil : .spring(duration: 0.6), value: ml)
                RFBottleShape().stroke(.white.opacity(0.18), lineWidth: 1.5)
                Text(String(format: "%.1f l", goal / 1000).replacingOccurrences(of: ".", with: ","))
                    .font(.system(.title2, design: .rounded).weight(.bold)).foregroundStyle(.white.opacity(0.35))
                    .offset(y: 10)
            }
            .frame(width: 78, height: 200)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Wasser heute: \(Int(ml)) von \(Int(goal)) Milliliter")
            .accessibilityAddTraits(.isStaticText)
            .accessibilityValue(String(Int(ml)))
            .accessibilityIdentifier("redfit-water-total")

            Button {
                model.perform("water", ["id": UUID().uuidString, "date": model.data.string("date"), "ml": 250])
            } label: {
                Image(systemName: "drop.fill").font(.title2).foregroundStyle(RFTheme.water).frame(width: 56, height: 56)
                    .symbolEffect(.bounce.down, value: ml)
            }
            .glassEffect(.regular.interactive(), in: .circle)
            .accessibilityLabel("250 ml hinzufügen")
            .accessibilityIdentifier("redfit-add-water")
            .sensoryFeedback(.increase, trigger: ml)
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
        let top = r.maxY - r.height * level
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
                        ZStack {
                            Circle().fill(logged ? Color.white : Color.primary.opacity(0.08))
                            Circle().inset(by: 6).fill(logged ? meal.tint.opacity(0.22) : .clear)
                            Image(systemName: meal.symbol).font(.title3).foregroundStyle(logged ? meal.tint : .secondary)
                        }
                        .frame(width: 56, height: 56)
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
