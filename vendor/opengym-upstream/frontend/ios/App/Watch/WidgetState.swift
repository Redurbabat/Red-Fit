import Foundation
import SwiftUI

/*
 * What the watch app shows, for its complications and the Smart Stack widget (ios/App/Watch/
 * Widgets): written by the app whenever it changes, read by the widget through the App Group.
 * Compiled into both. Plain text and numbers, no media.
 *
 *   rest   the rest running, until restEndsAt
 *   set    the set up next: exercise and weight × reps
 *   today  no workout running, today's planned one ready to start
 *   idle   nothing to show but the app
 */
struct WidgetState: Codable, Equatable {
    var mode: String
    var title: String
    var detail: String
    var restEndsAt: Date?
    /// Work sets done and in all, today's session (the complications' ring).
    var done: Int = 0
    var total: Int = 0
    /// "2/4": the set up next, of its exercise's work sets.
    var setLabel: String = ""
    var updatedAt: Date = .distantPast
    /// The app's language (the phone's), so the complications speak it too.
    var lang: String?

    static let idle = WidgetState(mode: "idle", title: "RED Fit", detail: "", restEndsAt: nil)
    static let groupId = "group.ch.redurbabat.redfit"
    private static let key = "widgetState"

    static func == (a: WidgetState, b: WidgetState) -> Bool {
        a.mode == b.mode && a.title == b.title && a.detail == b.detail && a.restEndsAt == b.restEndsAt
            && a.done == b.done && a.total == b.total && a.setLabel == b.setLabel && a.lang == b.lang
    }

    /// The state as written, unless it is about a session the watch app has not touched for 45
    /// minutes (it was closed, or the workout runs on the phone alone): then nothing to show, and
    /// the iPhone's Live Activity has the Smart Stack to itself instead of two cards saying the same.
    static func read() -> WidgetState {
        guard let d = UserDefaults(suiteName: groupId)?.data(forKey: key),
              let s = try? JSONDecoder().decode(WidgetState.self, from: d) else { return .idle }
        if (s.mode == "set" || s.mode == "rest") && Date().timeIntervalSince(s.updatedAt) > 45 * 60 { return .idle }
        return s
    }

    func write() {
        var s = self
        s.updatedAt = Date()
        if let d = try? JSONEncoder().encode(s) { UserDefaults(suiteName: WidgetState.groupId)?.set(d, forKey: WidgetState.key) }
    }
}

extension WidgetState {
    /// The locale for the widget's words: the app's language where this bundle has it, else English
    /// (a phone in English never gets a German complication from a watch set to German).
    var locale: Locale {
        guard let l = lang else { return .current }
        if l == "en" { return Locale(identifier: "en") }
        let name = ["pt": "pt-PT", "zh": "zh-Hans", "zh-TW": "zh-Hant"][l] ?? l
        return Locale(identifier: Bundle.main.path(forResource: name, ofType: "lproj") != nil ? name : "en")
    }
}

/// RED Fit's mark, the app icon's barbell (frontend/public/icon-512.png), drawn as one shape so it
/// takes the watch face's tint and stays sharp at every complication size.
struct OpenGymLogo: Shape {
    func path(in rect: CGRect) -> Path {
        let spans: [(CGFloat, CGFloat, CGFloat)] = [
            (38, 0, 8),
            (34, 1, 15),
            (32, 2, 19),
            (31, 3, 22),
            (29, 4, 25),
            (28, 5, 27),
            (27, 6, 29),
            (27, 7, 30),
            (26, 8, 32),
            (25, 9, 34),
            (25, 10, 35),
            (24, 11, 36),
            (24, 12, 37),
            (24, 13, 37),
            (24, 14, 38),
            (24, 15, 38),
            (24, 16, 39),
            (24, 17, 39),
            (24, 18, 40),
            (24, 19, 40),
            (25, 20, 39),
            (25, 21, 40),
            (26, 22, 39),
            (27, 23, 38),
            (28, 24, 37),
            (31, 25, 34),
            (34, 26, 31),
            (39, 27, 27),
            (42, 28, 24),
            (31, 29, 35),
            (27, 30, 39),
            (24, 31, 42),
            (21, 32, 45),
            (19, 33, 47),
            (17, 34, 49),
            (15, 35, 51),
            (14, 36, 33),
            (50, 36, 15),
            (12, 37, 33),
            (51, 37, 14),
            (11, 38, 32),
            (51, 38, 14),
            (10, 39, 31),
            (51, 39, 14),
            (9, 40, 30),
            (51, 40, 14),
            (8, 41, 30),
            (51, 41, 14),
            (7, 42, 29),
            (51, 42, 13),
            (6, 43, 29),
            (51, 43, 13),
            (71, 43, 7),
            (5, 44, 28),
            (51, 44, 13),
            (69, 44, 11),
            (5, 45, 27),
            (51, 45, 12),
            (68, 45, 13),
            (4, 46, 27),
            (51, 46, 12),
            (66, 46, 16),
            (3, 47, 27),
            (50, 47, 13),
            (65, 47, 18),
            (3, 48, 28),
            (50, 48, 12),
            (64, 48, 19),
            (2, 49, 31),
            (50, 49, 12),
            (63, 49, 21),
            (2, 50, 32),
            (50, 50, 11),
            (62, 50, 22),
            (2, 51, 34),
            (50, 51, 10),
            (61, 51, 24),
            (1, 52, 36),
            (50, 52, 35),
            (1, 53, 38),
            (50, 53, 35),
            (1, 54, 39),
            (49, 54, 36),
            (1, 55, 41),
            (49, 55, 37),
            (0, 56, 44),
            (49, 56, 37),
            (0, 57, 86),
            (0, 58, 24),
            (25, 58, 61),
            (0, 59, 24),
            (25, 59, 61),
            (0, 60, 24),
            (26, 60, 60),
            (0, 61, 24),
            (26, 61, 59),
            (0, 62, 24),
            (27, 62, 58),
            (1, 63, 24),
            (27, 63, 58),
            (1, 64, 24),
            (28, 64, 57),
            (1, 65, 24),
            (29, 65, 55),
            (1, 66, 25),
            (30, 66, 54),
            (2, 67, 24),
            (31, 67, 52),
            (2, 68, 25),
            (32, 68, 51),
            (3, 69, 24),
            (33, 69, 49),
            (3, 70, 24),
            (34, 70, 48),
            (4, 71, 23),
            (35, 71, 46),
            (5, 72, 22),
            (36, 72, 44),
            (5, 73, 22),
            (38, 73, 41),
            (6, 74, 21),
            (39, 74, 39),
            (8, 75, 18),
            (41, 75, 36),
            (9, 76, 17),
            (43, 76, 32),
            (10, 77, 15),
            (45, 77, 29),
            (12, 78, 11),
            (47, 78, 25),
            (16, 79, 4),
            (50, 79, 19),
            (55, 80, 10)
        ]
        let scale = min(rect.width / 86, rect.height / 81)
        let ox = rect.midX - 86 * scale / 2
        let oy = rect.midY - 81 * scale / 2
        var p = Path()
        for (x, y, w) in spans {
            p.addRect(CGRect(x: ox + x * scale, y: oy + y * scale, width: w * scale, height: scale))
        }
        return p
    }
}
