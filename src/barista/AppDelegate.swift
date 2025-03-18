import AppKit
import Cocoa
import HotKey
import UserNotifications

class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    var statusBarController = StatusBarController()

    // For Sparkle updates
    private var updaterController: AnyObject?
    private var sparkleAvailable = false
    private var hasShownUpdateAlert = false

    var hotKey: HotKey? {
        didSet {
            guard let hotKey = hotKey else { return }

            hotKey.keyDownHandler = { [weak self] in
                self?.statusBarController.expandCollapseIfNeeded()
            }
        }
    }

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        setupAutoStartApp()
        registerDefaultValues()
        setupHotKey()
        openPreferencesIfNeeded()
        detectLTRLang()
        setupUpdates()
        setupNotifications()

        // Connect the About menu item to our custom handler
        if let mainMenu = NSApp.mainMenu,
           let appMenu = mainMenu.items.first?.submenu,
           let aboutMenuItem = appMenu.items.first(where: { $0.title.contains("About") }) {
            aboutMenuItem.action = #selector(showAboutPanel)
            aboutMenuItem.target = self
        }

        // Also add a "Check for Updates..." menu item if Sparkle is available
        if sparkleAvailable,
           let mainMenu = NSApp.mainMenu,
           let appMenu = mainMenu.items.first?.submenu {
            let updateMenuItem = NSMenuItem(
                title: NSLocalizedString("Check for Updates...", comment: "Menu item title for checking updates"),
                action: #selector(checkForUpdates),
                keyEquivalent: ""
            )
            updateMenuItem.target = self
            appMenu.insertItem(updateMenuItem, at: 1) // Insert after About menu item
        }
    }

    @objc func checkForUpdates(_ sender: Any) {
        guard sparkleAvailable, let updaterController = updaterController else {
            print("Sparkle updater not initialized")
            return
        }

        print("Checking for updates...")

        // Reset the flag when starting a new check
        hasShownUpdateAlert = false

        // Store the SUUpdater instance if we find it
        var suUpdater: AnyObject?

        // Try different approaches to find the right method to call

        // 1. Try direct checkForUpdates: method on the controller
        let updateSelector = NSSelectorFromString("checkForUpdates:")
        if updaterController.responds(to: updateSelector) {
            print("Controller responds to checkForUpdates:")
            updaterController.perform(updateSelector, with: sender)
            return
        }

        // 2. Try to get the updater property and call checkForUpdates on it
        if updaterController.responds(to: NSSelectorFromString("updater")) {
            print("Controller responds to updater")
            if let updater = updaterController.perform(NSSelectorFromString("updater"))?.takeRetainedValue() {
                print("Got updater")
                if updater.responds(to: updateSelector) {
                    print("Updater responds to checkForUpdates:")
                    updater.perform(updateSelector, with: sender)
                    return
                }
            }
        }

        // 3. Try SUUpdater for older Sparkle versions
        if let updaterClass = NSClassFromString("SUUpdater") as? NSObject.Type {
            let sharedSelector = NSSelectorFromString("sharedUpdater")
            if updaterClass.responds(to: sharedSelector),
               let updater = updaterClass.perform(sharedSelector)?.takeRetainedValue() {
                print("Got SUUpdater.sharedUpdater")
                suUpdater = updater

                // Set delegate to self to receive update notifications
                if updater.responds(to: NSSelectorFromString("setDelegate:")) {
                    print("Setting delegate for SUUpdater")
                    updater.perform(NSSelectorFromString("setDelegate:"), with: self)
                }

                if updater.responds(to: updateSelector) {
                    print("SUUpdater responds to checkForUpdates:")
                    updater.perform(updateSelector, with: sender)

                    // Schedule a delayed notification if no update is found
                    // This is a fallback in case the delegate method isn't called
                    DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
                        self?.showNoUpdateFoundAlert()
                    }

                    return
                }
            }
        }

        print("Could not find a way to check for updates")
        showNoUpdateFoundAlert()
    }

    private func showNoUpdateFoundAlert() {
        // Only show the alert if we haven't shown it yet
        guard !hasShownUpdateAlert else {
            return
        }

        // Set the flag to prevent showing multiple alerts
        hasShownUpdateAlert = true

        // Show an alert in the main thread
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "No Updates Available"
            alert.informativeText = "You are running the latest version of the application."
            alert.alertStyle = .informational
            alert.addButton(withTitle: "OK")
            alert.runModal()
        }
    }

    // MARK: - Sparkle Delegate Methods

    // This will be called when no updates are found
    @objc func updaterDidNotFindUpdate(_ updater: AnyObject) {
        print("No updates found - delegate method called")
        showNoUpdateFoundAlert()
    }

    // This will be called when an update is found
    @objc func updater(_ updater: AnyObject, didFindValidUpdate item: AnyObject) {
        print("Update found: \(item)")
        // The update UI will be shown automatically by Sparkle
        hasShownUpdateAlert = true
    }

    // This will be called when there's an error checking for updates
    @objc func updater(_ updater: AnyObject, didFailToDownloadUpdate item: AnyObject, error: Error) {
        print("Update check failed: \(error)")

        // Show an error alert
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "Update Check Failed"
            alert.informativeText = "There was a problem checking for updates: \(error.localizedDescription)"
            alert.alertStyle = .warning
            alert.addButton(withTitle: "OK")
            alert.runModal()
        }

        hasShownUpdateAlert = true
    }

    // This will be called when the user cancels the update
    @objc func userDidCancelDownload(_ updater: AnyObject) {
        print("User cancelled update")
        hasShownUpdateAlert = true
    }

    func setupUpdates() {
        // Check if Sparkle framework exists in various locations
        let sparkleBundle: Bundle?

        print("Searching for Sparkle framework...")

        // First, try to find Sparkle in the app bundle's Frameworks directory
        if let bundleURL = Bundle.main.privateFrameworksURL?.appendingPathComponent("Sparkle.framework"),
           let bundle = Bundle(url: bundleURL) {
            print("Found Sparkle in privateFrameworksURL: \(bundleURL.path)")
            sparkleBundle = bundle
        }
        // Then try the app bundle's parent Frameworks directory
        else if let bundle = Bundle(path: "\(Bundle.main.bundlePath)/../Frameworks/Sparkle.framework") {
            print("Found Sparkle in app bundle: \(Bundle.main.bundlePath)/../Frameworks")
            sparkleBundle = bundle
        }
        // Then try the system Frameworks directory
        else if let bundle = Bundle(path: "/Library/Frameworks/Sparkle.framework") {
            print("Found Sparkle in /Library/Frameworks")
            sparkleBundle = bundle
        }
        // Then try the user's Frameworks directory
        else if let bundle = Bundle(path: "\(NSHomeDirectory())/Library/Frameworks/Sparkle.framework") {
            print("Found Sparkle in user Library: \(NSHomeDirectory())/Library/Frameworks")
            sparkleBundle = bundle
        }
        // Finally, try the project's Frameworks directory
        else if let bundle = Bundle(path: "\(Bundle.main.bundlePath)/../../Frameworks/Sparkle.framework") {
            print("Found Sparkle in project directory: \(Bundle.main.bundlePath)/../../Frameworks")
            sparkleBundle = bundle
        } else {
            print("Sparkle framework not found - auto-updates will be disabled")
            print("Bundle.main.privateFrameworksURL: \(Bundle.main.privateFrameworksURL?.path ?? "nil")")
            print("NSHomeDirectory(): \(NSHomeDirectory())")
            print("Bundle.main.bundlePath: \(Bundle.main.bundlePath)")
            return
        }

        // Try to load the Sparkle bundle
        guard sparkleBundle!.load() else {
            print("Could not load Sparkle framework")
            return
        }

        print("Sparkle bundle loaded successfully")

        // Try multiple approaches to initialize the updater

        // 1. First try SPUStandardUpdaterController (Sparkle 2.x)
        if let updaterControllerClass = NSClassFromString("SPUStandardUpdaterController") as? NSObject.Type {
            print("Found SPUStandardUpdaterController class")

            // Try to initialize with initWithUpdaterDelegate:userDriverDelegate:
            if let controllerAlloc = updaterControllerClass.perform(NSSelectorFromString("alloc"))?.takeRetainedValue() {
                print("Allocated SPUStandardUpdaterController")

                // Try to initialize with the standard init method
                if controllerAlloc.responds(to: NSSelectorFromString("init")),
                   let controller = controllerAlloc.perform(NSSelectorFromString("init"))?.takeRetainedValue() {
                    print("Initialized SPUStandardUpdaterController with init")

                    // Check if the controller has an updater property
                    if controller.responds(to: NSSelectorFromString("updater")),
                       let updater = controller.perform(NSSelectorFromString("updater"))?.takeRetainedValue() {
                        print("Got updater from controller")
                        // Store both the controller and updater
                        updaterController = controller
                        sparkleAvailable = true
                        return
                    } else {
                        print("Controller doesn't have an updater property, using controller directly")
                        updaterController = controller
                        sparkleAvailable = true
                        return
                    }
                }
            }
        }

        // 2. Try SUUpdater (Sparkle 1.x)
        if let updaterClass = NSClassFromString("SUUpdater") as? NSObject.Type {
            print("Found SUUpdater class")

            // Try to get the shared updater
            let selector = NSSelectorFromString("sharedUpdater")
            if updaterClass.responds(to: selector),
               let updater = updaterClass.perform(selector)?.takeRetainedValue() {
                print("Got SUUpdater.sharedUpdater")
                updaterController = updater
                sparkleAvailable = true
                return
            }
        }

        print("Failed to initialize Sparkle")
    }

    @objc func showAboutPanel(_ sender: Any) {
        // Show the preferences window with the About tab selected
        let storyboard = NSStoryboard(name: "Main", bundle: nil)
        if let windowController = storyboard.instantiateController(withIdentifier: "MainWindow") as? NSWindowController {
            windowController.window?.makeKeyAndOrderFront(nil)

            // Select the About tab
            if let prefWindowController = windowController as? PreferencesWindowController {
                prefWindowController.showAboutTab()
            }
        }
    }

    func openPreferencesIfNeeded() {
        if Preferences.isShowPreference {
            Util.showPrefWindow()
        }
    }

    func setupAutoStartApp() {
        Util.setUpAutoStart(isAutoStart: Preferences.isAutoStart)
    }

    func registerDefaultValues() {
         UserDefaults.standard.register(defaults: [
            UserDefaults.Key.isAutoStart: false,
            UserDefaults.Key.isShowPreference: true,
            UserDefaults.Key.isAutoHide: true,
            UserDefaults.Key.numberOfSecondForAutoHide: 10.0,
            UserDefaults.Key.areSeparatorsHidden: false,
            UserDefaults.Key.alwaysHiddenSectionEnabled: false,
            UserDefaults.Key.isCaffeinateEnabled: false,
            UserDefaults.Key.caffeinateDurationMinutes: 30
         ])
    }

    func setupHotKey() {
        guard let globalKey = Preferences.globalKey else {return}
        hotKey = HotKey(keyCombo: KeyCombo(carbonKeyCode: globalKey.keyCode, carbonModifiers: globalKey.carbonFlags))
    }

    func detectLTRLang() {
        // Languages, like Arabic, use right to left (RTL) writing direction,
        // so some behavior of the app needs to be changed in these cases
        Constant.isUsingLTRLanguage = (NSApplication.shared.userInterfaceLayoutDirection == .leftToRight)
    }

    func setupNotifications() {
        // Set up notification delegate
        UNUserNotificationCenter.current().delegate = self

        // Request notification permission
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, error in
            if let error = error {
                print("Notification permission error: \(error)")
            }
        }
    }

    // MARK: - UNUserNotificationCenterDelegate

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                               willPresent notification: UNNotification,
                               withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show the notification even when the app is in the foreground
        completionHandler([.banner, .sound])
    }
}
