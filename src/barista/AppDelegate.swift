import AppKit
import HotKey

@NSApplicationMain

class AppDelegate: NSObject, NSApplicationDelegate {
    var statusBarController = StatusBarController()

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

        // Connect the About menu item to our custom handler
        if let mainMenu = NSApp.mainMenu,
           let appMenu = mainMenu.items.first?.submenu,
           let aboutMenuItem = appMenu.items.first(where: { $0.title.contains("About") }) {
            aboutMenuItem.action = #selector(showAboutPanel)
            aboutMenuItem.target = self
        }
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
}
