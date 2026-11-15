import SwiftUI
import Charts

// The Körper tab: your progress, not exercises. Weight with its goal, progress photos, body
// measurements and training progress. All numbers come from the original core: `bodyweight`,
// `measurements`, `workouts` and the widget snapshot (`home.widget`: weight, records, volume,
// streak), so this page and the Home Screen widgets agree. Nothing here writes except the
// existing `weight` action and the shared photo tile.

struct RFBodyView: View {
    @ObservedObject var model: RFAppModel
    @State private var appeared = false

    private var widget: RFRecord { model.data.record("home").record("widget") }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                RFWeightCard(model: model, widget: widget)
                    .modifier(RFBodyEntrance(index: 0, shown: appeared))
                RFPhotoMeasureRow(model: model)
                    .modifier(RFBodyEntrance(index: 1, shown: appeared))
                RFTrainingProgressCard(model: model, widget: widget)
                    .modifier(RFBodyEntrance(index: 2, shown: appeared))
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .scrollIndicators(.hidden)
        .background(RFTheme.background.ignoresSafeArea())
        .navigationTitle("Körper")
        .onAppear { appeared = true }
        .accessibilityIdentifier("redfit-native-body")
    }
}

/// Same rise-in as Home's sections.
private struct RFBodyEntrance: ViewModifier {
    let index: Int
    let shown: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func body(content: Content) -> some View {
        content
            .opacity(shown ? 1 : 0)
            .offset(y: shown || reduceMotion ? 0 : 22)
            .animation(reduceMotion ? .easeOut(duration: 0.2) : RFMotion.spring.delay(Double(index) * 0.07), value: shown)
    }
}

private struct RFCard<Content: View>: View {
    let title: String
    let systemImage: String
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label(title, systemImage: systemImage).font(.headline).accessibilityAddTraits(.isHeader)
            content
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RFTheme.card, in: .rect(cornerRadius: RFTheme.radius))
    }
}

// MARK: - weight

private struct RFWeightCard: View {
    @ObservedObject var model: RFAppModel
    let widget: RFRecord
    @State private var range = 90
    @State private var entry = ""
    @FocusState private var typing: Bool

    private var unit: String { model.data.string("unit", "kg") }
    private var points: [(date: Date, w: Double)] {
        let all = model.data.records("bodyweight").compactMap { row -> (Date, Double)? in
            guard let d = RFDates.date(row.string("d")), row.number("w") > 0 else { return nil }
            return (d, row.number("w"))
        }.sorted { $0.0 < $1.0 }
        guard range > 0, let last = all.last?.0 else { return all.map { ($0.0, $0.1) } }
        let from = Calendar.current.date(byAdding: .day, value: -range, to: last) ?? last
        return all.filter { $0.0 >= from }.map { ($0.0, $0.1) }
    }

    var body: some View {
        let weight = widget.record("weight")
        let pts = points
        let change = (pts.last?.w ?? 0) - (pts.first?.w ?? 0)
        let goal = weight.number("goal")
        RFCard(title: "Gewicht", systemImage: "scalemass") {
            if let current = pts.last?.w {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(current.formatted(.number.precision(.fractionLength(0...1))))
                        .font(.system(size: 44, weight: .bold, design: .rounded)).monospacedDigit()
                        .contentTransition(.numericText()).animation(RFMotion.spring, value: current)
                    Text(unit).font(.title3).foregroundStyle(.secondary)
                    Spacer()
                    if pts.count > 1 {
                        Label((change > 0 ? "+" : "") + change.formatted(.number.precision(.fractionLength(1))) + " " + unit,
                              systemImage: change > 0 ? "arrow.up.right" : change < 0 ? "arrow.down.right" : "equal")
                            .font(.subheadline.weight(.semibold)).monospacedDigit()
                            .padding(.horizontal, 10).padding(.vertical, 6)
                            .background(Color.primary.opacity(0.08), in: .capsule)
                            .accessibilityLabel("Veränderung im Zeitraum: \(change.formatted(.number.precision(.fractionLength(1)))) \(unit)")
                    }
                }
                if !weight.string("line").isEmpty {
                    Text(goal > 0 ? "Ziel \(goal.formatted()) \(unit) · \(weight.string("line"))" : weight.string("line"))
                        .font(.caption).foregroundStyle(.secondary)
                }
                Picker("Zeitraum", selection: $range) {
                    Text("30 T").tag(30); Text("90 T").tag(90); Text("1 J").tag(365); Text("Alles").tag(0)
                }
                .pickerStyle(.segmented)
                if pts.count > 1 {
                    Chart {
                        ForEach(Array(pts.enumerated()), id: \.offset) { _, p in
                            AreaMark(x: .value("Datum", p.date), y: .value("Gewicht", p.w))
                                .foregroundStyle(LinearGradient(colors: [model.accent.opacity(0.35), model.accent.opacity(0)], startPoint: .top, endPoint: .bottom))
                                .interpolationMethod(.monotone)
                            LineMark(x: .value("Datum", p.date), y: .value("Gewicht", p.w))
                                .foregroundStyle(model.accent).lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round))
                                .interpolationMethod(.monotone)
                        }
                        if goal > 0 {
                            RuleMark(y: .value("Ziel", goal))
                                .foregroundStyle(.secondary).lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                                .annotation(position: .top, alignment: .trailing) { Text("Ziel").font(.caption2).foregroundStyle(.secondary) }
                        }
                    }
                    .chartYScale(domain: .automatic(includesZero: false))
                    .chartXAxis { AxisMarks(values: .automatic(desiredCount: 4)) { _ in AxisValueLabel(format: .dateTime.day().month(.abbreviated)) } }
                    .frame(height: 170)
                    .animation(RFMotion.spring, value: range)
                    .accessibilityLabel("Gewichtsverlauf")
                }
            } else {
                Text("Trag dein Gewicht ein, dann siehst du hier deinen Verlauf.").font(.subheadline).foregroundStyle(.secondary)
            }
            HStack {
                TextField("Gewicht heute in \(unit)", text: $entry).keyboardType(.decimalPad).focused($typing)
                    .padding(.horizontal, 12).frame(minHeight: 44)
                    .background(Color.primary.opacity(0.06), in: .rect(cornerRadius: 12))
                    .accessibilityIdentifier("redfit-weight-entry")
                Button("Speichern") {
                    guard let value = Double(entry.replacingOccurrences(of: ",", with: ".")), value > 0 else { model.error = "Bitte ein Gewicht eingeben."; return }
                    model.perform("weight", ["weight": value]) { entry = ""; typing = false }
                }
                .buttonStyle(.glass).frame(minHeight: 44).disabled(entry.isEmpty || model.pending > 0)
            }
        }
    }
}

// MARK: - photos and measurements

private struct RFPhotoMeasureRow: View {
    @ObservedObject var model: RFAppModel

    private static let fields: [(key: String, label: String, percent: Bool)] = [
        ("waist", "Taille", false), ("chest", "Brust", false), ("hips", "Hüfte", false),
        ("upperArmRight", "Oberarm", false), ("thighRight", "Oberschenkel", false), ("bodyFat", "Körperfett", true)]

    /// The latest value of a field and its change against the reading before.
    private func latest(_ key: String) -> (value: Double, change: Double?)? {
        let values = model.data.records("measurements").compactMap { $0.raw[key] as? NSNumber }.map(\.doubleValue).filter { $0 > 0 }
        guard let last = values.last else { return nil }
        return (last, values.count > 1 ? last - values[values.count - 2] : nil)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 14) {
                RFProgressPhotoTile(model: model, photo: model.data.record("home").record("latestPhoto"))
                    .frame(width: 130, height: 170)
                RFCard(title: "Maße", systemImage: "ruler") {
                    let shown = Self.fields.compactMap { field in latest(field.key).map { (field, $0) } }
                    if shown.isEmpty {
                        Text("Noch keine Messungen.").font(.subheadline).foregroundStyle(.secondary)
                    } else {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(shown.prefix(4), id: \.0.key) { field, value in
                                HStack {
                                    Text(field.label).font(.subheadline)
                                    Spacer()
                                    Text(value.value.formatted(.number.precision(.fractionLength(0...1))) + (field.percent ? " %" : " cm"))
                                        .font(.subheadline.weight(.semibold)).monospacedDigit()
                                    if let change = value.change, change != 0 {
                                        Image(systemName: change > 0 ? "arrow.up" : "arrow.down").font(.caption2.weight(.bold)).foregroundStyle(.secondary)
                                    }
                                }
                                .accessibilityElement(children: .combine)
                            }
                        }
                    }
                    Button("Maße eintragen", systemImage: "plus") { model.showOriginal("/measurements", title: "Körpermaße") }
                        .font(.subheadline.weight(.semibold)).frame(minHeight: 44)
                }
            }
        }
    }
}

// MARK: - training progress

private struct RFTrainingProgressCard: View {
    @ObservedObject var model: RFAppModel
    let widget: RFRecord

    /// Workouts per week over the last eight weeks, oldest first.
    private var weeks: [(start: Date, count: Int)] {
        let cal = Calendar(identifier: .iso8601)
        let now = Date()
        guard let thisWeek = cal.dateInterval(of: .weekOfYear, for: now)?.start else { return [] }
        let starts = (0..<8).reversed().compactMap { cal.date(byAdding: .weekOfYear, value: -$0, to: thisWeek) }
        let days = model.data.records("workouts").compactMap { RFDates.date($0.string("d")) }
        return starts.map { start in
            let end = cal.date(byAdding: .weekOfYear, value: 1, to: start) ?? start
            return (start, days.filter { $0 >= start && $0 < end }.count)
        }
    }

    var body: some View {
        let streak = widget.record("streakInfo")
        let records = widget.record("records")
        let volume = widget.record("volume")
        RFCard(title: "Trainingsfortschritt", systemImage: "chart.bar.xaxis") {
            HStack(spacing: 10) {
                stat("\(Int(streak.number("current")))", "Wochen Serie", "flame.fill", .orange)
                stat("\(Int(records.number("month")))", "Rekorde im Monat", "trophy.fill", .yellow)
                stat((volume.raw["pct"] as? NSNumber).map { ($0.intValue > 0 ? "+" : "") + "\($0.intValue)%" } ?? "–", "Volumen zur Vorwoche", "scalemass.fill", model.accent)
            }
            if !records.record("last").string("name").isEmpty {
                Label("Letzter Rekord: \(records.record("last").string("name")) \(records.record("last").string("value"))", systemImage: "medal")
                    .font(.caption).foregroundStyle(.secondary).lineLimit(2)
            }
            let data = weeks
            Chart(Array(data.enumerated()), id: \.offset) { _, week in
                BarMark(x: .value("Woche", week.start, unit: .weekOfYear), y: .value("Trainings", week.count))
                    .foregroundStyle(model.accent.gradient).cornerRadius(5)
            }
            .chartXAxis { AxisMarks(values: .stride(by: .weekOfYear, count: 2)) { _ in AxisValueLabel(format: .dateTime.day().month(.abbreviated)) } }
            .chartYAxis { AxisMarks(values: .automatic(desiredCount: 3)) }
            .frame(height: 130)
            .accessibilityLabel("Trainings pro Woche, letzte acht Wochen")
            Text("Trainings pro Woche · beste Serie \(Int(streak.number("best"))) Wochen").font(.caption).foregroundStyle(.secondary)
        }
    }

    private func stat(_ value: String, _ label: String, _ icon: String, _ color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: icon).foregroundStyle(color).font(.subheadline)
            Text(value).font(.system(.title2, design: .rounded).weight(.bold)).monospacedDigit().lineLimit(1).minimumScaleFactor(0.6)
            Text(label).font(.caption2).foregroundStyle(.secondary).lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.primary.opacity(0.05), in: .rect(cornerRadius: 16))
        .accessibilityElement(children: .combine)
    }
}
