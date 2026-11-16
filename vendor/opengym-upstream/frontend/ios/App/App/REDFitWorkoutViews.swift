import SwiftUI

// The live workout's own pieces (performance plan, phase 3): a header with the current exercise
// large, a rest ring, and the finish moment. Every write goes through the original core's
// workout and rest actions; these views only show its state.

// MARK: - header

struct RFWorkoutHeader: View {
    @ObservedObject var model: RFAppModel
    @State private var current: RFRecord?

    private var entries: [RFRecord] { model.active.records("entries") }
    /// The first exercise with a set still open, else the last one.
    private var currentEntry: (index: Int, entry: RFRecord)? {
        for (i, e) in entries.enumerated() where e.records("sets").contains(where: { !$0.bool("done") }) { return (i, e) }
        return entries.last.map { (entries.count - 1, $0) }
    }

    var body: some View {
        let done = model.active.number("done"), total = max(1, model.active.number("total"))
        VStack(spacing: 16) {
            HStack(spacing: 18) {
                ZStack {
                    RFRing(value: done / total, color: model.accent, lineWidth: 10)
                    VStack(spacing: 0) {
                        Text("\(Int(done))").font(.system(.title, design: .rounded).weight(.bold)).monospacedDigit()
                            .contentTransition(.numericText()).animation(.snappy, value: Int(done))
                        Text("von \(Int(total))").font(.caption2).foregroundStyle(.secondary)
                    }
                }
                .frame(width: 86, height: 86)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(Int(done)) von \(Int(total)) Sätzen")

                VStack(alignment: .leading, spacing: 8) {
                    TimelineView(.periodic(from: .now, by: 1)) { timeline in
                        stat("Zeit", Duration.seconds(max(0, timeline.date.timeIntervalSince1970 - model.active.number("start") / 1000)).formatted(.time(pattern: .hourMinuteSecond)), "clock")
                    }
                    stat("Volumen", "\(Int(model.active.number("volume"))) \(model.data.string("unit", "kg"))", "scalemass")
                }
                Spacer(minLength: 0)
            }

            if let cur = currentEntry {
                HStack(spacing: 14) {
                    Group {
                        if let current { RFExerciseMedia(exercise: current, controls: false).allowsHitTesting(false) }
                        else { Color.black.overlay { Image(systemName: "figure.strengthtraining.traditional").font(.title).foregroundStyle(.secondary) } }
                    }
                    .frame(width: 110, height: 110)
                    .clipShape(.rect(cornerRadius: 22))
                    .id(cur.entry.id)
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Jetzt").font(.caption.weight(.semibold)).foregroundStyle(model.accent)
                        Text(cur.entry.string("name")).font(.headline).lineLimit(2)
                        if let next = cur.entry.records("sets").firstIndex(where: { !$0.bool("done") }) {
                            let set = cur.entry.records("sets")[next]
                            Text("Satz \(next + 1) · \(set.number("w").formatted()) \(cur.entry.string("unit", model.data.string("unit", "kg"))) × \(set.number("r").formatted())")
                                .font(.subheadline).foregroundStyle(.secondary).monospacedDigit()
                        } else {
                            Label("Alle Sätze erledigt", systemImage: "checkmark.seal.fill").font(.subheadline).foregroundStyle(model.accent)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .animation(RFMotion.spring, value: cur.entry.id)
                .task(id: cur.entry.id) {
                    guard let result = try? await model.request("exercise", ["id": cur.entry.id]),
                          let raw = result["exercise"] as? [String: Any] else { current = nil; return }
                    withAnimation(RFMotion.spring) { current = RFRecord(raw) }
                }
            }
        }
        .padding(.vertical, 6)
    }

    private func stat(_ label: String, _ value: String, _ icon: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon).foregroundStyle(.secondary).frame(width: 18)
            VStack(alignment: .leading, spacing: 0) {
                Text(value).font(.headline).monospacedDigit()
                Text(label).font(.caption2).foregroundStyle(.secondary)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

// MARK: - rest ring

struct RFRestRing: View {
    @ObservedObject var model: RFAppModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        if model.data.raw["timer"] is [String: Any] {
            let timer = model.data.record("timer")
            TimelineView(.animation(minimumInterval: reduceMotion ? 1 : 1.0 / 30, paused: timer.bool("paused"))) { timeline in
                let total = max(1, timer.number("total", 60))
                let left = timer.bool("paused") ? timer.number("left") : max(0, timer.number("endsAt") / 1000 - timeline.date.timeIntervalSince1970)
                let finished = timer.bool("ready") || left <= 0
                HStack(spacing: 18) {
                    ZStack {
                        Circle().stroke(Color.orange.opacity(0.18), lineWidth: 9)
                        Circle().trim(from: 0, to: finished ? 1 : left / total)
                            .stroke(finished ? model.accent : .orange, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        Text(finished ? "Los!" : Duration.seconds(left.rounded(.up)).formatted(.time(pattern: .minuteSecond)))
                            .font(.system(.title3, design: .rounded).weight(.bold)).monospacedDigit()
                            .contentTransition(.numericText(countsDown: true))
                    }
                    .frame(width: 92, height: 92)
                    .sensoryFeedback(.success, trigger: finished)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(finished ? "Pause beendet" : "Pause, noch \(Int(left)) Sekunden")

                    VStack(alignment: .leading, spacing: 10) {
                        Text(finished ? "Pause beendet" : timer.bool("paused") ? "Pause angehalten" : "Pause").font(.headline)
                        HStack(spacing: 8) {
                            control("−15", "Pause 15 Sekunden kürzer") { model.perform("rest", ["operation": "add", "seconds": -15]) }
                            control(timer.bool("paused") ? "play.fill" : "pause.fill", timer.bool("paused") ? "Pause fortsetzen" : "Pause anhalten", symbol: true) {
                                model.perform("rest", ["operation": timer.bool("paused") ? "resume" : "pause"])
                            }
                            control("+15", "Pause 15 Sekunden länger") { model.perform("rest", ["operation": "add", "seconds": 15]) }
                            control("forward.end.fill", "Pause überspringen", symbol: true) { model.perform("rest", ["operation": finished ? "stop" : "skip"]) }
                        }
                    }
                    Spacer(minLength: 0)
                }
                .padding(.vertical, 6)
            }
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }

    private func control(_ title: String, _ label: String, symbol: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Group { if symbol { Image(systemName: title) } else { Text(title).monospacedDigit() } }
                .font(.subheadline.weight(.semibold))
                .frame(width: 44, height: 44)
                .contentShape(.circle)
        }
        // Several buttons in one List row: .borderless keeps each tap to its own button.
        .buttonStyle(.borderless)
        .foregroundStyle(.primary)
        .glassEffect(.regular.interactive(), in: .circle)
        .accessibilityLabel(label)
    }
}

// MARK: - finish moment

/// After "Abschließen": the numbers count up and a short burst of confetti, then the details.
struct RFFinishCelebration: View {
    let workout: RFRecord
    let unit: String
    let streak: Int
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    private var sets: Int { workout.records("entries").reduce(0) { $0 + $1.records("sets").filter { $0.bool("done") }.count } }
    private var minutes: Int { Int(max(0, workout.number("end") - workout.number("start")) / 60000) }

    var body: some View {
        NavigationStack {
            ZStack {
                if !reduceMotion { RFConfetti().allowsHitTesting(false).accessibilityHidden(true) }
                VStack(spacing: 24) {
                    Image(systemName: "trophy.fill").font(.system(size: 64)).foregroundStyle(.yellow)
                        .symbolEffect(.bounce, value: shown)
                    Text("Stark gemacht!").font(.largeTitle.weight(.bold))
                    Text(workout.string("name", "Training")).font(.title3).foregroundStyle(.secondary)
                    HStack(spacing: 12) {
                        number(shown ? Int(workout.number("volume")) : 0, unit, "Volumen")
                        number(shown ? sets : 0, "", "Sätze")
                        number(shown ? minutes : 0, "min", "Dauer")
                    }
                    if streak > 0 {
                        Label("\(streak) \(streak == 1 ? "Woche" : "Wochen") in Serie", systemImage: "flame.fill")
                            .font(.headline).foregroundStyle(.orange)
                            .padding(.horizontal, 16).padding(.vertical, 10)
                            .glassEffect(.regular, in: .capsule)
                    }
                    NavigationLink("Details ansehen") { RFWorkoutSummary(workout: workout, unit: unit) }
                        .buttonStyle(.glass)
                }
                .padding(24)
            }
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Fertig") { dismiss() } } }
            .onAppear { withAnimation(.spring(response: 1.2, dampingFraction: 0.9).delay(0.2)) { shown = true } }
            .sensoryFeedback(.success, trigger: shown)
        }
    }

    private func number(_ value: Int, _ suffix: String, _ label: String) -> some View {
        VStack(spacing: 4) {
            Text("\(value)" + (suffix.isEmpty ? "" : " \(suffix)"))
                .font(.system(.title2, design: .rounded).weight(.bold)).monospacedDigit()
                .contentTransition(.numericText())
                .lineLimit(1).minimumScaleFactor(0.6)
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 14)
        .background(RFTheme.card, in: .rect(cornerRadius: 18))
        .accessibilityElement(children: .combine)
    }
}

/// A one-off burst of confetti in the brand colours, drawn with Canvas (about 1.6 s, then still).
private struct RFConfetti: View {
    @State private var start = Date()
    private struct Piece { let x: Double; let speed: Double; let drift: Double; let spin: Double; let size: Double; let color: Color }
    private let pieces: [Piece] = (0..<70).map { _ in
        Piece(x: .random(in: 0...1), speed: .random(in: 0.55...1.1), drift: .random(in: -0.15...0.15),
              spin: .random(in: -6...6), size: .random(in: 5...10),
              color: [Color.green, .white, .yellow, .orange, Color(red: 0.12, green: 0.75, blue: 0.26)].randomElement()!)
    }
    var body: some View {
        TimelineView(.animation) { timeline in
            let t = timeline.date.timeIntervalSince(start)
            Canvas { context, size in
                guard t < 2.2 else { return }
                for p in pieces {
                    let y = -20 + t * p.speed * size.height * 0.75 + t * t * 120
                    let x = p.x * size.width + sin(t * 3 + p.spin) * 30 + p.drift * t * size.width
                    var c = context
                    c.opacity = max(0, 1 - max(0, t - 1.4) / 0.8)
                    c.translateBy(x: x, y: y)
                    c.rotate(by: .radians(t * p.spin))
                    c.fill(Path(CGRect(x: -p.size / 2, y: -p.size / 4, width: p.size, height: p.size / 2)), with: .color(p.color))
                }
            }
        }
        .ignoresSafeArea()
    }
}
