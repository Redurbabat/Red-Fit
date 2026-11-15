import SwiftUI

enum RFDay {
    static func key(_ date: Date) -> String {
        let formatter = DateFormatter(); formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

struct RFMacroSummary: View {
    let totals: RFRecord
    let goal: RFRecord
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .firstTextBaseline) {
                Text(totals.number("kcal").formatted(.number.precision(.fractionLength(0)))).font(.system(.largeTitle, design: .rounded).weight(.semibold)).contentTransition(.numericText())
                Text(goal.number("kcal") > 0 ? "von \(Int(goal.number("kcal"))) kcal" : "kcal").foregroundStyle(.secondary)
            }
            if goal.number("kcal") > 0 { ProgressView(value: min(totals.number("kcal"), goal.number("kcal")), total: goal.number("kcal")) }
            HStack {
                macro("Protein", "protein", .blue)
                Spacer(); macro("Kohlenhydrate", "carbs", .orange)
                Spacer(); macro("Fett", "fat", .purple)
            }
        }.padding(.vertical, 8).monospacedDigit()
    }
    private func macro(_ label: String, _ key: String, _ color: Color) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(totals.number(key).formatted(.number.precision(.fractionLength(1))) + " g").font(.subheadline.weight(.semibold)).foregroundStyle(color)
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }.accessibilityElement(children: .combine)
    }
}

struct RFNutritionView: View {
    @ObservedObject var model: RFAppModel
    @State private var day = Date()
    @State private var addFood = false
    @State private var addMeal = false
    @State private var addRecipe = false
    private var meals: [RFRecord] { model.data.record("nutrition").records("entries").filter { $0.string("date") == RFDay.key(day) } }
    private var totals: RFRecord {
        var total: [String: Any] = [:]
        for key in ["kcal", "protein", "carbs", "fat"] { total[key] = meals.reduce(0) { $0 + $1.number(key) } }
        return RFRecord(total)
    }
    var body: some View {
        List {
            Section {
                DatePicker("Tag", selection: $day, displayedComponents: .date)
                RFMacroSummary(totals: totals, goal: model.data.record("goal"))
                Button("Mahlzeit erfassen", systemImage: "plus.circle.fill") { addMeal = true }.frame(minHeight: 44).accessibilityIdentifier("redfit-add-meal")
            }
            ForEach(["Frühstück", "Mittagessen", "Abendessen", "Snack"], id: \.self) { type in
                let entries = meals.filter { $0.string("mealType") == type }
                if !entries.isEmpty { Section(type) {
                    ForEach(entries) { meal in
                        HStack {
                            VStack(alignment: .leading, spacing: 5) { Text(meal.string("foodName")); Text(meal.number("grams").formatted(.number.precision(.fractionLength(0...1))) + " g").font(.caption).foregroundStyle(.secondary) }
                            Spacer(); Text("\(Int(meal.number("kcal").rounded())) kcal").font(.subheadline).monospacedDigit()
                        }.swipeActions { Button("Entfernen", role: .destructive) { model.perform("removeMeal", ["id": meal.id]) } }
                    }
                } }
            }
            Section("Planen & vorbereiten") {
                NavigationLink { RFMealPlanView(model: model) } label: { Label("Wochen-Essensplan", systemImage: "calendar") }
                NavigationLink { RFShoppingView(model: model) } label: { Label("Einkaufsliste", systemImage: "basket") }
                Button("Rezept erstellen", systemImage: "book.closed") { addRecipe = true }
                Button("Lebensmittel anlegen", systemImage: "plus") { addFood = true }
                NavigationLink { RFGoalsView(model: model) } label: { Label("Ernährungsziele", systemImage: "target") }
            }
            Section("Deine Lebensmittel & Rezepte") {
                ForEach(model.data.record("nutrition").records("foods")) { food in
                    HStack {
                        Label(food.string("name"), systemImage: food.raw["recipe"] is [String: Any] ? "book.closed" : "carrot")
                        Spacer(); Text("\(Int(food.number("kcal100").rounded())) / 100 g").font(.caption).foregroundStyle(.secondary)
                    }
                }
                if model.data.record("nutrition").records("foods").isEmpty { Text("Lege ein Lebensmittel mit den Nährwerten seiner Verpackung an.").foregroundStyle(.secondary) }
            }
        }.rfScreen().navigationTitle("Ernährung").accessibilityIdentifier("redfit-native-nutrition")
            .sheet(isPresented: $addMeal) { RFMealEditor(model: model, date: day, planned: false) }
            .sheet(isPresented: $addFood) { RFFoodEditor(model: model) }
            .sheet(isPresented: $addRecipe) { RFRecipeEditor(model: model) }
    }
}

private struct RFFoodEditor: View {
    @ObservedObject var model: RFAppModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var kcal = ""
    @State private var protein = ""
    @State private var carbs = ""
    @State private var fat = ""
    @State private var barcode = ""
    var body: some View {
        NavigationStack {
            Form {
                Section("Lebensmittel") { TextField("Name", text: $name).accessibilityIdentifier("redfit-food-name"); TextField("Barcode (optional)", text: $barcode).keyboardType(.numberPad) }
                Section("Nährwerte pro 100 g") {
                    RFLabeledNumber(label: "Kalorien (kcal)", text: $kcal)
                    RFLabeledNumber(label: "Protein (g)", text: $protein)
                    RFLabeledNumber(label: "Kohlenhydrate (g)", text: $carbs)
                    RFLabeledNumber(label: "Fett (g)", text: $fat)
                }
            }.navigationTitle("Lebensmittel").navigationBarTitleDisplayMode(.inline).toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Speichern") { save() }.disabled(model.pending > 0 || name.trimmingCharacters(in: .whitespaces).isEmpty) }
            }
        }
    }
    private func save() {
        guard let k = RFNumber(kcal), let p = RFNumber(protein), let c = RFNumber(carbs), let f = RFNumber(fat) else { model.error = "Bitte alle Nährwerte als Zahlen eingeben."; return }
        model.perform("food", ["food": ["id": UUID().uuidString, "name": name, "kcal100": k, "protein100": p, "carbs100": c, "fat100": f, "barcode": barcode]]) { dismiss() }
    }
}

private struct RFMealEditor: View {
    @ObservedObject var model: RFAppModel
    var date: Date
    let planned: Bool
    @Environment(\.dismiss) var dismiss
    @State private var foodId = ""
    @State private var grams = "100"
    @State private var mealType = "Frühstück"
    @State private var cooked = false
    @State private var yieldFactor = "3"
    @State private var selectedDate = Date()
    @State private var newFood = false
    @State private var entryId = UUID().uuidString
    private var foods: [RFRecord] { model.data.record("nutrition").records("foods") }
    private var food: RFRecord { foods.first { $0.id == foodId } ?? RFRecord() }
    private var factor: Double { (RFNumber(grams) ?? 0) / (cooked ? max(0.1, RFNumber(yieldFactor) ?? 1) : 1) / 100 }
    var body: some View {
        NavigationStack {
            Form {
                Section("Mahlzeit") {
                    DatePicker("Tag", selection: $selectedDate, displayedComponents: .date)
                    Picker("Mahlzeit", selection: $mealType) { ForEach(["Frühstück", "Mittagessen", "Abendessen", "Snack"], id: \.self) { Text($0) } }
                    Picker("Lebensmittel", selection: $foodId) { Text("Bitte wählen").tag(""); ForEach(foods) { Text($0.string("name")).tag($0.id) } }
                    Button("Neues Lebensmittel") { newFood = true }
                    RFLabeledNumber(label: "Abgewogene Menge (g)", text: $grams)
                }
                Section {
                    Toggle("Gekocht abgewogen", isOn: $cooked)
                    if cooked { RFLabeledNumber(label: "Gekochtes / rohes Gewicht", text: $yieldFactor); Text("Zum Beispiel 300 g gekocht aus 100 g roh: Faktor 3. Die Nährwerte werden aus der Rohmenge berechnet.").font(.footnote).foregroundStyle(.secondary) }
                }
                if !foodId.isEmpty { Section("Berechnete Nährwerte") { RFMacroSummary(totals: RFRecord(["kcal": food.number("kcal100") * factor, "protein": food.number("protein100") * factor, "carbs": food.number("carbs100") * factor, "fat": food.number("fat100") * factor]), goal: RFRecord()) } }
            }.navigationTitle(planned ? "Mahlzeit planen" : "Mahlzeit erfassen").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) { Button(planned ? "Planen" : "Speichern") {
                        guard let grams = RFNumber(grams), let yield = cooked ? RFNumber(yieldFactor) : 1 else { model.error = "Bitte gültige Mengen eingeben."; return }
                        model.perform(planned ? "planMeal" : "meal", ["id": entryId, "foodId": foodId, "grams": grams, "yieldFactor": yield, "cooked": cooked, "mealType": mealType, "date": RFDay.key(selectedDate)]) { dismiss() }
                    }.disabled(foodId.isEmpty || model.pending > 0) }
                }.sheet(isPresented: $newFood) { RFFoodEditor(model: model) }
        }.onAppear { selectedDate = date }
    }
}

private struct RFRecipeEditor: View {
    @ObservedObject var model: RFAppModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var servings = "2"
    @State private var yield = ""
    @State private var foodId = ""
    @State private var grams = "100"
    @State private var ingredients: [RFRecord] = []
    @State private var recipeId = UUID().uuidString
    private var foods: [RFRecord] { model.data.record("nutrition").records("foods") }
    var body: some View {
        NavigationStack {
            Form {
                Section("Rezept") { TextField("Name", text: $name); RFLabeledNumber(label: "Portionen", text: $servings); RFLabeledNumber(label: "Fertiges Gesamtgewicht (g)", text: $yield) }
                Section("Zutaten") {
                    ForEach(Array(ingredients.enumerated()), id: \.offset) { _, row in LabeledContent(row.string("name"), value: row.number("grams").formatted() + " g") }.onDelete { ingredients.remove(atOffsets: $0) }
                    Picker("Lebensmittel", selection: $foodId) { Text("Bitte wählen").tag(""); ForEach(foods) { Text($0.string("name")).tag($0.id) } }
                    RFLabeledNumber(label: "Rohe Zutatenmenge (g)", text: $grams)
                    Button("Zutat hinzufügen", systemImage: "plus") {
                        guard let grams = RFNumber(grams), grams > 0, let food = foods.first(where: { $0.id == foodId }) else { model.error = "Bitte eine Zutat und Menge wählen."; return }
                        ingredients.append(RFRecord(["id": UUID().uuidString, "foodId": food.id, "name": food.string("name"), "grams": grams]))
                    }.disabled(foodId.isEmpty)
                }
                Section { Text("Die Zutaten und ihre Nährwerte werden im Rezept gespeichert. Spätere Änderungen an Lebensmitteln verändern bereits erfasste Mahlzeiten nicht.").font(.footnote).foregroundStyle(.secondary) }
            }.navigationTitle("Neues Rezept").navigationBarTitleDisplayMode(.inline).toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Speichern") {
                    guard let servings = RFNumber(servings), let yield = RFNumber(yield) else { model.error = "Bitte Portionen und Gesamtgewicht eingeben."; return }
                    model.perform("recipe", ["id": recipeId, "name": name, "servings": servings, "yieldGrams": yield, "ingredients": ingredients.map { ["foodId": $0.string("foodId"), "grams": $0.number("grams")] }]) { dismiss() }
                }.disabled(name.isEmpty || ingredients.isEmpty || model.pending > 0) }
            }
        }
    }
}

private struct RFMealPlanView: View {
    @ObservedObject var model: RFAppModel
    @State private var from = Date()
    @State private var planning = false
    var body: some View {
        List {
            Section { DatePicker("Woche ab", selection: $from, displayedComponents: .date); Button("Mahlzeit planen", systemImage: "plus") { planning = true }; NavigationLink("Einkaufsliste") { RFShoppingView(model: model, initialDate: from) } }
            ForEach(0..<7, id: \.self) { offset in
                let day = Calendar.current.date(byAdding: .day, value: offset, to: from) ?? from
                let plans = model.data.record("nutrition").records("plans").filter { $0.string("date") == RFDay.key(day) }
                Section(day.formatted(.dateTime.weekday(.wide).day().month(.abbreviated))) {
                    if plans.isEmpty { Text("Noch nichts geplant").foregroundStyle(.secondary) }
                    ForEach(plans) { plan in
                        HStack {
                            VStack(alignment: .leading, spacing: 5) { Text(plan.string("foodName")); Text(plan.string("mealType") + " · " + plan.number("grams").formatted() + " g").font(.caption).foregroundStyle(.secondary) }
                            Spacer()
                            if plan.string("status") == "done" { Image(systemName: "checkmark.circle.fill").foregroundStyle(.green).accessibilityLabel("Als gegessen erfasst") }
                            else { Button("Gegessen", systemImage: "checkmark.circle") { model.perform("completePlan", ["planId": plan.id, "entryId": "planned-" + plan.id]) }.labelStyle(.iconOnly).buttonStyle(.borderless).frame(width: 44, height: 44).disabled(model.pending > 0) }
                        }
                    }
                }
            }
        }.rfScreen().navigationTitle("Essensplan").sheet(isPresented: $planning) { RFMealEditor(model: model, date: from, planned: true) }
    }
}

private struct RFShoppingView: View {
    @ObservedObject var model: RFAppModel
    var initialDate = Date()
    @State private var from = Date()
    private var rows: [RFRecord] {
        let end = Calendar.current.date(byAdding: .day, value: 7, to: from) ?? from
        let plans = model.data.record("nutrition").records("plans").filter { $0.string("date") >= RFDay.key(from) && $0.string("date") < RFDay.key(end) && $0.string("status") != "done" }
        var grouped: [String: (String, Double)] = [:]
        for plan in plans { for ingredient in plan.records("ingredients") { let key = ingredient.string("foodName").lowercased(); let current = grouped[key]; grouped[key] = (current?.0 ?? ingredient.string("foodName"), (current?.1 ?? 0) + ingredient.number("grams")) } }
        return grouped.sorted { $0.key < $1.key }.map { RFRecord(["id": $0.key, "name": $0.value.0, "grams": $0.value.1]) }
    }
    var body: some View {
        List {
            Section { DatePicker("Woche ab", selection: $from, displayedComponents: .date) }
            Section("Aus offenen Mahlzeiten") {
                ForEach(rows) { row in
                    let checked = model.data.record("extras").records("shopping").first { $0.id == row.id && $0.string("date") == RFDay.key(from) }?.bool("checked") ?? false
                    Button { model.perform("shopping", ["id": row.id, "date": RFDay.key(from), "checked": !checked]) } label: {
                        HStack { Image(systemName: checked ? "checkmark.circle.fill" : "circle"); Text(row.string("name")).strikethrough(checked).foregroundStyle(.primary); Spacer(); Text(row.number("grams").formatted(.number.precision(.fractionLength(0...1))) + " g").font(.subheadline).foregroundStyle(.secondary) }.frame(minHeight: 44)
                    }.accessibilityValue(checked ? "Eingekauft" : "Offen")
                }
                if rows.isEmpty { ContentUnavailableView("Deine Einkaufsliste ist leer", systemImage: "basket", description: Text("Plane Mahlzeiten für diese Woche. Die benötigten Zutaten erscheinen automatisch hier.")) }
            }
        }.rfScreen().navigationTitle("Einkaufsliste").onAppear { from = initialDate }
    }
}

struct RFGoalsView: View {
    @ObservedObject var model: RFAppModel
    @State private var kcal = ""
    @State private var protein = ""
    @State private var carbs = ""
    @State private var fat = ""
    @State private var water = ""
    @State private var message = ""
    var body: some View {
        Form {
            Section("Tägliche Ziele ab heute") {
                RFLabeledNumber(label: "Kalorien (kcal)", text: $kcal)
                RFLabeledNumber(label: "Protein (g)", text: $protein)
                RFLabeledNumber(label: "Kohlenhydrate (g)", text: $carbs)
                RFLabeledNumber(label: "Fett (g)", text: $fat)
                RFLabeledNumber(label: "Wasser (ml)", text: $water)
                Button("Ziele speichern") {
                    guard let k = RFNumber(kcal), let p = RFNumber(protein), let c = RFNumber(carbs), let f = RFNumber(fat), let w = RFNumber(water) else { model.error = "Bitte alle Ziele eingeben. 0 bedeutet kein Ziel."; return }
                    model.perform("goals", ["id": UUID().uuidString, "date": model.data.string("date"), "kcal": k, "protein": p, "carbs": c, "fat": f, "water": w]) { message = "Ziele gespeichert." }
                }.disabled(model.pending > 0)
            }
            if !message.isEmpty { Text(message).foregroundStyle(.secondary) }
            Section { Text("Die App gibt keine Werte vor. Trage deine eigenen Ziele ein; bisherige Einträge bleiben unverändert.").font(.footnote).foregroundStyle(.secondary) }
        }.rfScreen().navigationTitle("Ernährungsziele").onAppear { let goal = model.data.record("goal"); kcal = String(Int(goal.number("kcal"))); protein = String(Int(goal.number("protein"))); carbs = String(Int(goal.number("carbs"))); fat = String(Int(goal.number("fat"))); water = String(Int(goal.number("water"))) }
    }
}

private func RFNumber(_ text: String) -> Double? {
    guard let number = Double(text.replacingOccurrences(of: ",", with: ".")), number.isFinite else { return nil }
    return number
}
private struct RFLabeledNumber: View {
    let label: String
    @Binding var text: String
    var body: some View { HStack { Text(label); Spacer(); TextField("0", text: $text).multilineTextAlignment(.trailing).keyboardType(.decimalPad).frame(minWidth: 70, maxWidth: 120).accessibilityLabel(label) } }
}
