import XCTest
import UIKit

/**
 * Walks the iPhone app the way someone new does and checks what only a real phone shows: that the
 * end of a rest still arrives as a notification once the app has left the screen (RestAlertPlugin),
 * that a sheet with a text field stays above the keyboard, and that the training reminder and the
 * missed-day nudge are really pending with iOS once switched on. Run by .github/workflows/ios.yml,
 * which adds this target to the project for the run only (ios/ci/add-ui-tests.rb). The run's
 * build carries no exercise media, so the screenshots it keeps show placeholders.
 */
final class OpenGymUITests: XCTestCase {
    let app = XCUIApplication()
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")

    override func setUp() {
        continueAfterFailure = false
    }

    override func record(_ issue: XCTIssue) {
        // This CI target uses only synthetic local data. Keep a useful native
        // hierarchy in its log when UIKit/bridge integration fails.
        print("REDFIT_NATIVE_FAILURE " + app.debugDescription)
        super.record(issue)
    }

    private func dockShot(_ dock: XCUIElement, _ name: String) {
        let image = XCUIScreen.main.screenshot().image
        let bounds = app.frame
        let rect = dock.frame.intersection(bounds)
        guard !rect.isEmpty, bounds.width > 0, bounds.height > 0, let source = image.cgImage else { return }
        // XCTest element frames are points; screenshot metadata does not always
        // carry the device's 2x/3x scale. Map the actual pixel dimensions explicitly.
        let scaleX = CGFloat(source.width) / bounds.width
        let scaleY = CGFloat(source.height) / bounds.height
        guard let crop = source.cropping(to: CGRect(
            x: (rect.minX - bounds.minX) * scaleX, y: (rect.minY - bounds.minY) * scaleY,
            width: rect.width * scaleX, height: rect.height * scaleY
        )) else { return }
        let attachment = XCTAttachment(image: UIImage(cgImage: crop))
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func shot(_ name: String) {
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = name
        a.lifetime = .keepAlways
        add(a)
    }

    private func tap(_ e: XCUIElement, _ what: String, timeout: TimeInterval = 15) {
        XCTAssertTrue(e.waitForExistence(timeout: timeout), "\(what) did not show up")
        e.tap()
    }

    private func button(startingWith prefix: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", prefix)).firstMatch
    }

    /**
     * Full Body A from the start chooser (views/Workout.jsx StartChooser). On a day the starter plan
     * schedules it (a Monday) it is today's plan, a card whose name is only a title and whose
     * button is "Start Full Body A"; on any other day it is a row under Other routines, tapped by
     * its name. Tapping the title on a Monday did nothing (CI 2026-10-26).
     */
    private func startFullBodyA() {
        let today = app.buttons["Start Full Body A"]
        let row = app.staticTexts["Full Body A"]
        XCTAssertTrue(row.waitForExistence(timeout: 15), "Full Body A did not show up")
        if today.exists { today.tap() } else { row.tap() }
    }

    /**
     * "Use on this device", until home shows. On a slow simulator the first tap can land while the
     * page is still starting and go nowhere. The first-start steps come right after the choice
     * (views/PermissionSteps.jsx): notifications (allowed here, and so is the system's question)
     * and, on an iPhone with Apple Health, the Health step (Continue, then Don't Allow in the iOS
     * sheet). Nothing is tapped twice and
     * nothing in the app is tapped while a system alert is up: a late alert used to swallow one
     * tap and pass the next one through to home underneath (CI 10-13, the gym card opened).
     */
    private func chooseLocal() {
        // RED Fit's enforced local-only boot can open Home directly. Older
        // installations may still show "Use on this device"; a fresh local
        // onboarding screen instead offers "RED Fit öffnen". All three paths
        // must be accepted without changing or clearing stored workout data.
        func dismissTour() {
            if app.staticTexts["Want a 1-minute tour?"].exists, app.buttons["Skip"].exists {
                app.buttons["Skip"].tap()
            }
        }
        let homeToday = app.webViews.firstMatch.buttons.matching(
            NSPredicate(format: "label BEGINSWITH[c] %@ OR label BEGINSWITH[c] %@", "Today", "Heute")
        ).firstMatch
        let legacyChoice = app.buttons["Use on this device"]
        let localOnlyChoice = app.buttons["RED Fit öffnen"]
        let deadline = Date().addingTimeInterval(100)
        while Date() < deadline {
            if systemAlertUp() { allowSystemAlert(within: 3) }
            dismissTour()
            if homeToday.exists { return }

            if localOnlyChoice.exists && localOnlyChoice.isHittable {
                localOnlyChoice.tap()
                passPermissionSteps()
            } else if legacyChoice.exists && legacyChoice.isHittable {
                legacyChoice.tap()
                passPermissionSteps()
            } else if app.staticTexts["Never miss the end of a rest"].exists
                        || app.staticTexts["Your workouts in Apple Health"].exists {
                passPermissionSteps()
            }
            dismissTour()
            if homeToday.waitForExistence(timeout: 2) { return }
        }
        shot("redfit-onboarding-failure")
        let snapshot = XCTAttachment(string: app.debugDescription)
        snapshot.name = "redfit-onboarding-accessibility"
        snapshot.lifetime = .keepAlways
        add(snapshot)
        XCTFail("Neither the local Home dashboard nor a usable first-run choice appeared")
    }

    private func systemAlertUp() -> Bool { springboard.alerts.firstMatch.exists }

    /**
     * Both first-start steps, whichever show, each with its one Continue (App Review 5.1.1(iv)):
     * notifications, then the system's own Allow (waited for up to 20 s, the simulator can be slow
     * to ask); Apple Health, then Don't Allow in the iOS sheet, which leaves it off. Done when neither step is on screen any more.
     */
    private func passPermissionSteps() {
        let notifications = app.staticTexts["Never miss the end of a rest"]
        let health = app.staticTexts["Your workouts in Apple Health"]
        var allowedNotifications = false, declinedHealth = false
        let until = Date().addingTimeInterval(60)
        guard notifications.waitForExistence(timeout: 8) || health.exists else { return }
        while Date() < until {
            if systemAlertUp() { allowSystemAlert(within: 20); sleep(1); continue }
            if notifications.exists {
                if !allowedNotifications {
                    shot("0-permission-step")
                    let next = app.buttons["Continue"]
                    if next.exists { next.tap(); allowedNotifications = true }
                    // The system asks next; give it time before looking at the page again.
                    _ = springboard.alerts.firstMatch.waitForExistence(timeout: 20)
                }
                sleep(1)
                continue
            }
            if health.exists {
                if !declinedHealth {
                    shot("0b-apple-health-step")
                    let next = app.buttons["Continue"]
                    if next.exists { next.tap(); declinedHealth = true }
                }
                // The Health sheet is the app's own window, not a springboard alert.
                let dont = app.buttons["Don't Allow"]
                if dont.waitForExistence(timeout: 10) { dont.tap() }
                sleep(1)
                continue
            }
            // Neither shows: the next step may still be coming (the page checks each one first).
            if !health.waitForExistence(timeout: 3) && !notifications.exists { return }
        }
    }

    private func allowSystemAlert(within seconds: Int) {
        let allow = springboard.alerts.buttons["Allow"]
        for _ in 0..<seconds {
            if allow.exists { allow.tap(); return }
            sleep(1)
        }
    }

    /** A switch on, for sure: tapped until it reads on, a system question answered in between. */
    private func switchOn(_ sw: XCUIElement, _ what: String) {
        XCTAssertTrue(sw.waitForExistence(timeout: 15), "no \(what) switch")
        for _ in 0..<6 {
            if systemAlertUp() { allowSystemAlert(within: 5) }
            if (sw.value as? String) == "1" { return }
            sw.tap()
            allowSystemAlert(within: 5)
            sleep(1)
        }
        XCTAssertEqual(sw.value as? String, "1", "the \(what) switch did not stay on")
    }

    /**
     * Smoke test for the REAL iOS 26 UIKit tab bar installed above the original
     * Capacitor WKWebView. A source-level check cannot detect an invisible or
     * untappable dock, a lost JavaScript route, or accidentally duplicated web views.
     * Run independently via AppUITests scheme / -only-testing (no real account).
     */
    func test0REDFitNativeTabBarKeepsOriginalNavigation() {
        guard #available(iOS 26.0, *) else { return }
        // This test verifies native navigation, not the optional HealthKit
        // authorization sheet. The app's narrowly scoped test launch argument
        // marks only the onboarding explanations as seen; OS permissions are
        // never granted or bypassed.
        app.launchArguments = ["-REDFitUITestSkipOnboardingPermissions", "-REDFitLegacyUITest"]
        app.launch()
        chooseLocal()
        // The first-run tour is a real modal, so finish its invitation before
        // interacting with the native peer navigation behind it.
        if app.staticTexts["Want a 1-minute tour?"].waitForExistence(timeout: 5) {
            tap(app.buttons["Skip"], "skip the optional introduction")
        }

        let dock = app.tabBars.matching(identifier: "redfit-system-tabbar").firstMatch
        XCTAssertTrue(dock.waitForExistence(timeout: 30), "native iPhone system tab bar is missing")
        let web = app.webViews.matching(identifier: "redfit-workout-webview").firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 20), "original workout web view is missing")
        let structure = app.staticTexts["redfit-native-structure"]
        XCTAssertTrue(structure.waitForExistence(timeout: 10), "native view structure probe is missing")
        XCTAssertEqual(structure.label, "webviews:1; native-tabs:5", "navigation must preserve one actual WKWebView")
        XCTAssertEqual(app.tabBars.count, 1, "exactly one real UIKit tab bar must own the dock")
        XCTAssertEqual(dock.buttons.count, 5, "all five native destinations must be accessible")
        // Crop only our native dock on an empty synthetic Home screen. The CI
        // may expose this crop, never an IPA, exercise media or personal records.
        dockShot(dock, "redfit-glass-home")

        // Every tab must navigate through the existing React Router, not just
        // change the native selected item. Headers are scoped to WKWebView
        // because the system tab bar also displays these tab titles.
        for (tab, header) in [("Plan", "Plan"), ("Stats", "Stats"), ("Exercises", "Exercises")] {
            tap(dock.buttons[tab], "native " + tab)
            XCTAssertTrue(web.staticTexts[header].waitForExistence(timeout: 20),
                "native " + tab + " did not open the original " + header + " page")
            XCTAssertEqual(structure.label, "webviews:1; native-tabs:5", "switching to " + tab + " replaced the web view")
        }
        tap(dock.buttons["Home"], "native Home")
        XCTAssertTrue(web.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Today")).firstMatch.waitForExistence(timeout: 20),
            "native Home did not restore the original dashboard")

        tap(dock.buttons["Start"], "native Start workout")
        XCTAssertTrue(web.staticTexts["Start workout"].waitForExistence(timeout: 20),
            "native Start did not open the original workout picker")
        XCTAssertEqual(structure.label, "webviews:1; native-tabs:5", "starting a workout must preserve WKWebView")
        shot("redfit-native-system-tabbar")
    }

    // XCTest runs a class's tests in name order: the keyboard check wants a plain home screen, and
    // this one leaves a workout running.
    func test2RestEndsWithANotificationInTheBackground() {
        app.launch()
        chooseLocal()
        shot("1-home")
        tap(app.buttons["Load starter plan"], "Load starter plan")
        tap(button(startingWith: "Full Body"), "the Full Body plan")
        tap(app.buttons["Choose a different workout"], "Choose a different workout")
        startFullBodyA()
        shot("2-workout")
        let tick = app.switches["Set 1 done"]
        tap(tick, "Set 1 done")
        // The first rest asks for notifications; on a slow simulator the question can take a while.
        let countdown = button(startingWith: "1:")
        let allow = springboard.alerts.buttons["Allow"]
        var counting = false
        for i in 0..<40 {
            if allow.exists { allow.tap() }
            if countdown.exists { counting = true; break }
            // A tap that did not tick (something moved under it): once more, never on a ticked set.
            if i == 4, (tick.value as? String) == "0" { tick.tap() }
            sleep(1)
        }
        if allow.waitForExistence(timeout: 2) { allow.tap() }
        if !counting {
            shot("3-no-countdown")
            let tree = XCTAttachment(string: app.debugDescription)
            tree.name = "app tree without a countdown"
            tree.lifetime = .keepAlways
            add(tree)
        }
        XCTAssertTrue(counting, "no rest countdown after a set")
        shot("3-rest")

        XCUIDevice.shared.press(.home)
        // The rest is 90 s; its end has to arrive on its own, with the app in the background.
        let banner = springboard.descendants(matching: .any)
            .matching(NSPredicate(format: "label CONTAINS[c] %@", "Next set")).firstMatch
        let arrived = banner.waitForExistence(timeout: 120)
        shot("4-notification")
        XCTAssertTrue(arrived, "the end of the rest never arrived as a notification")
    }

    /**
     * The training reminder and the missed-day nudge reach iOS as pending local notifications:
     * a workout logged today (finished here, or the one test2 left running), the reminder and
     * the nudge switched on, and then iOS itself is asked what it holds for the app. The app
     * shows that only when launched with -OpenGymUITestPending (MainViewController.swift).
     * Reminder ids are 1000-1059 (one per planned day in 60), nudge ids 2000-2006
     * (lib/mobile.js); with a three-day plan and a workout today the week ahead always has both.
     */
    func test3ReminderAndNudgeArePendingNotifications() {
        app.launchArguments = ["-OpenGymUITestPending"]
        app.launch()
        let finish = app.buttons["Finish"]
        let resume = app.buttons["Resume"]
        let home = app.buttons["Log"]
        let local = app.buttons["Use on this device"]
        // One query for any of the four, waited on, rather than four polled every second: on a busy
        // simulator each poll is a whole snapshot of the app, and they ran past XCTest's limit (CI 10-13).
        let anyScreen = app.buttons.matching(NSPredicate(format: "label IN %@", ["Finish", "Resume", "Log", "Use on this device"])).firstMatch
        XCTAssertTrue(anyScreen.waitForExistence(timeout: 120), "the app never showed a screen")
        if local.exists { chooseLocal() }
        if !finish.exists && resume.exists { resume.tap() }
        if !finish.waitForExistence(timeout: 5) {
            // Nothing running (test2 failed early or ran alone): start one the way test2 does.
            XCTAssertTrue(home.waitForExistence(timeout: 30), "home did not show")
            if app.buttons["Load starter plan"].waitForExistence(timeout: 5) {
                tap(app.buttons["Load starter plan"], "Load starter plan")
                tap(button(startingWith: "Full Body"), "the Full Body plan")
            }
            tap(app.buttons["Choose a different workout"], "Choose a different workout")
            startFullBodyA()
            tap(app.switches["Set 1 done"], "Set 1 done")
            allowSystemAlert(within: 5)
        }
        tap(finish, "Finish")
        tap(button(startingWith: "Finish and save"), "Finish and save")
        // The summary is a centred card taller than the screen: its button is at the foot of the
        // card's own scroll, below what shows (CI 10-13: the tap landed under the card).
        let nice = app.buttons["Nice!"]
        XCTAssertTrue(nice.waitForExistence(timeout: 20), "Nice! (the summary) did not show up")
        let window = app.windows.firstMatch
        let bottom = window.frame.maxY - 80
        for _ in 0..<6 where nice.frame.maxY > bottom {
            // A drag in the middle of the card, upwards: scrolls the card, never dismisses it.
            window.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.65))
                .press(forDuration: 0.05, thenDragTo: window.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.3)))
            sleep(1)
        }
        shot("6-summary")
        nice.tap()
        for _ in 0..<5 where nice.exists { sleep(1) }
        if nice.exists { nice.tap() }
        shot("6-finished")

        tap(button(startingWith: "Settings"), "Settings")
        tap(button(startingWith: "Reminders"), "Reminders")
        switchOn(app.switches["Workout day reminder"], "reminder")
        switchOn(app.switches["Nudge me when I skip a planned workout"], "nudge")
        shot("7-reminders-on")

        // The store reschedules on its next save; poll what iOS holds until both kinds are there.
        let probe = app.staticTexts["og-pending-notifications"]
        XCTAssertTrue(probe.waitForExistence(timeout: 20), "the pending-notifications probe is missing")
        var ids: [Int] = []
        for _ in 0..<45 {
            ids = probe.label.replacingOccurrences(of: "pending:", with: "").split(separator: ",").compactMap { Int($0) }
            if ids.contains(where: { (1000...1059).contains($0) }) && ids.contains(where: { (2000...2006).contains($0) }) { break }
            sleep(1)
        }
        let pending = XCTAttachment(string: probe.label)
        pending.name = "pending notifications"
        pending.lifetime = .keepAlways
        add(pending)
        XCTAssertTrue(ids.contains(where: { (1000...1059).contains($0) }), "no training reminder pending: \(probe.label)")
        XCTAssertTrue(ids.contains(where: { (2000...2006).contains($0) }), "no missed-day nudge pending: \(probe.label)")
    }

    func test1WeighInSheetStaysAboveTheKeyboard() {
        app.launch()
        chooseLocal()
        tap(app.buttons["Log"], "Log (body weight)")
        let field = app.textFields.firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 15), "no weight field")
        // The sheet slides in; wait until the field is where a finger can reach it.
        for _ in 0..<20 where !field.isHittable { usleep(500_000) }
        field.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10), "no keyboard")
        shot("5-keyboard")
        let save = app.buttons["Save"]
        XCTAssertTrue(save.waitForExistence(timeout: 5), "no Save button")
        let keyboardTop = app.keyboards.firstMatch.frame.minY
        XCTAssertLessThanOrEqual(save.frame.maxY, keyboardTop + 1, "Save sits under the keyboard")
    }
}

// Runs against the real SwiftUI surface and its original local JavaScript core.
// Use a dedicated synthetic Simulator; never seed or clear an owner's installation.
final class REDFitSwiftUIUITests: XCTestCase {
    let app = XCUIApplication()
    override func setUp() { continueAfterFailure = false; app.launchArguments = ["-AppleLanguages", "(de)", "-AppleLocale", "de_CH", "-REDFitUITestSkipOnboardingPermissions"] }
    override func record(_ issue: XCTIssue) { print("REDFIT_SWIFTUI_FAILURE " + app.debugDescription); super.record(issue) }
    private func shot(_ name: String) { let item = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); item.name = name; item.lifetime = .keepAlways; add(item) }
    private func start() {
        app.launch()
        XCTAssertTrue(app.navigationBars["RED Fit"].waitForExistence(timeout: 45), "native Home never became ready")
        XCTAssertEqual(app.tabBars.count, 1)
    }
    func testNativeNavigationWaterAndColdRestart() {
        start()
        shot("redfit-swiftui-home")
        for (tab, title) in [("Training", "Training"), ("Ernährung", "Ernährung"), ("Körper", "Körper"), ("Mehr", "Mehr")] {
            app.tabBars.buttons[tab].tap()
            XCTAssertTrue(app.navigationBars[title].waitForExistence(timeout: 10))
            shot("redfit-swiftui-" + title)
        }
        app.tabBars.buttons["Heute"].tap()
        let water = app.buttons["redfit-add-water"]
        if !water.isHittable { app.swipeUp() }
        let total = app.staticTexts["redfit-water-total"]
        XCTAssertTrue(total.waitForExistence(timeout: 10))
        let expected = String((Int(total.value as? String ?? "0") ?? 0) + 250)
        XCTAssertTrue(water.waitForExistence(timeout: 10)); water.tap()
        XCTAssertTrue(NSPredicate(format: "value == %@", expected).evaluate(with: total) || XCTWaiter.wait(for: [expectation(for: NSPredicate(format: "value == %@", expected), evaluatedWith: total)], timeout: 10) == .completed)
        app.terminate(); start()
        if !total.isHittable { app.swipeUp() }
        XCTAssertTrue(total.waitForExistence(timeout: 10), "water total missing after cold restart")
        XCTAssertEqual(total.value as? String, expected, "durable water entry lost after cold restart")
    }
    func testHomeDashboardShowsStreakGoalMealsAndWater() {
        start()
        XCTAssertTrue(app.otherElements["redfit-native-home"].firstMatch.waitForExistence(timeout: 10) || app.scrollViews.firstMatch.exists)
        XCTAssertTrue(app.staticTexts["redfit-home-greeting"].waitForExistence(timeout: 10), "greeting missing")
        XCTAssertTrue(app.buttons["redfit-streak"].waitForExistence(timeout: 10), "streak control missing")
        XCTAssertTrue(app.buttons["redfit-history"].exists, "calendar/history control missing")
        XCTAssertTrue(app.buttons["redfit-progress-photo"].exists, "progress photo card missing")
        XCTAssertTrue(app.descendants(matching: .any)["redfit-weekly-goal"].exists, "weekly goal missing")
        if !app.buttons["redfit-meals-card"].isHittable { app.swipeUp() }
        XCTAssertTrue(app.buttons["redfit-meals-card"].waitForExistence(timeout: 10), "meals card missing")
        XCTAssertTrue(app.buttons["redfit-start-workout"].waitForExistence(timeout: 10), "start workout missing")
        shot("redfit-swiftui-home-dashboard")
        app.buttons["redfit-history"].tap()
        XCTAssertTrue(app.navigationBars["Verlauf"].waitForExistence(timeout: 10))
        app.buttons["Fertig"].tap()
        app.buttons["redfit-meals-card"].tap()
        XCTAssertTrue(app.navigationBars["Ernährung"].waitForExistence(timeout: 10))
    }
    func testNativePlanExerciseAndWorkout() {
        start()
        app.tabBars.buttons["Training"].tap()
        let create = app.buttons["Plan erstellen"]
        XCTAssertTrue(create.waitForExistence(timeout: 10)); create.tap()
        let name = app.textFields["redfit-plan-name"]
        XCTAssertTrue(name.waitForExistence(timeout: 10)); name.tap(); name.typeText("QA Oberkörper")
        app.buttons["Übung hinzufügen"].tap()
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 10)); search.tap(); search.typeText("bench press")
        let result = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "redfit-exercise-")).firstMatch
        XCTAssertTrue(result.waitForExistence(timeout: 15)); result.tap()
        app.buttons["redfit-save-plan"].tap()
        XCTAssertTrue(app.buttons["Plan trainieren"].firstMatch.waitForExistence(timeout: 10)); app.buttons["Plan trainieren"].firstMatch.tap()
        let checkbox = app.buttons["redfit-set-0-0-both"]
        XCTAssertTrue(checkbox.waitForExistence(timeout: 20), "native workout did not receive original session entries")
        let weight = app.textFields["Gewicht Satz 1"]
        XCTAssertTrue(weight.waitForExistence(timeout: 10)); weight.tap()
        let old = weight.value as? String ?? "0"
        weight.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: old.count) + "60")
        checkbox.tap()
        XCTAssertEqual(checkbox.label, "Satz zurücknehmen")
        shot("redfit-swiftui-workout")
        app.terminate(); app.launch()
        XCTAssertTrue(app.buttons["redfit-active-workout"].waitForExistence(timeout: 45), "active original workout lost after restart")
        app.buttons["redfit-active-workout"].tap()
        XCTAssertTrue(checkbox.waitForExistence(timeout: 15)); XCTAssertEqual(checkbox.label, "Satz zurücknehmen")
    }
}
