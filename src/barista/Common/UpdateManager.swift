import Cocoa

class UpdateManager: NSObject {
    // Create a shared instance for use throughout the app
    static let shared = UpdateManager()

    // The updater instance (using AnyObject to avoid direct Sparkle dependencies)
    private var updaterController: AnyObject?
    private var sparkleAvailable = false

    private override init() {
        super.init()

        // We'll initialize Sparkle dynamically if available
        setupSparkle()
    }

    private func setupSparkle() {
        // Check if Sparkle framework exists in various locations
        let sparkleBundle: Bundle?

        if let bundleURL = Bundle.main.privateFrameworksURL?.appendingPathComponent("Sparkle.framework"),
           let bundle = Bundle(url: bundleURL) {
            sparkleBundle = bundle
        } else if let bundle = Bundle(path: "/Library/Frameworks/Sparkle.framework") {
            sparkleBundle = bundle
        } else if let bundle = Bundle(path: "\(NSHomeDirectory())/Library/Frameworks/Sparkle.framework") {
            sparkleBundle = bundle
        } else if let bundle = Bundle(path: "\(Bundle.main.bundlePath)/../Frameworks/Sparkle.framework") {
            sparkleBundle = bundle
        } else {
            print("Sparkle framework not found - auto-updates will be disabled")
            return
        }

        // Try to load the Sparkle bundle
        guard sparkleBundle!.load() else {
            print("Could not load Sparkle framework")
            return
        }

        // Load classes dynamically to avoid direct dependencies that would cause build failures
        guard let updaterControllerClass = NSClassFromString("SPUStandardUpdaterController") as? NSObject.Type,
              let userDriverDelegateClass = NSClassFromString("SPUStandardUserDriverDelegate") as? NSObject.Type else {
            print("Sparkle classes not found")
            return
        }

        // Create the driver delegate using runtime methods to avoid build dependencies
        let selector = NSSelectorFromString("initWithHostBundle:")
        guard let method = userDriverDelegateClass.method(for: selector) else {
            print("Required Sparkle method not found")
            return
        }

        let mainBundle = Bundle.main
        typealias InitFunction = @convention(c) (AnyObject, Selector, Bundle) -> AnyObject
        let initMethod = unsafeBitCast(method, to: InitFunction.self)
        let updaterDelegate = initMethod(userDriverDelegateClass, selector, mainBundle)

        // Create the controller
        let initUpdaterSelector = NSSelectorFromString("initWithStartingUpdater:updaterDelegate:userDriverDelegate:")
        guard let updaterMethod = updaterControllerClass.method(for: initUpdaterSelector) else {
            print("Updater init method not found")
            return
        }

        typealias UpdaterInitFunction = @convention(c) (AnyObject, Selector, Bool, AnyObject, AnyObject) -> AnyObject
        let updaterInitMethod = unsafeBitCast(updaterMethod, to: UpdaterInitFunction.self)
        updaterController = updaterInitMethod(updaterControllerClass, initUpdaterSelector, true, updaterDelegate, updaterDelegate)

        sparkleAvailable = true
        print("Sparkle framework initialized successfully")
    }

    // Method to programmatically check for updates
    func checkForUpdates() {
        guard sparkleAvailable, let updaterController = updaterController else {
            print("Sparkle updater not initialized")
            return
        }

        let selector = NSSelectorFromString("checkForUpdates:")
        if updaterController.responds(to: selector),
           let method = type(of: updaterController).method(for: selector) {
            typealias CheckForUpdatesFunction = @convention(c) (AnyObject, Selector, AnyObject?) -> Void
            let checkForUpdatesMethod = unsafeBitCast(method, to: CheckForUpdatesFunction.self)
            checkForUpdatesMethod(updaterController, selector, nil)
        }
    }

    // Setup method called from AppDelegate to create the singleton
    static func setupUpdates() {
        // Access the shared instance to ensure it's initialized
        _ = UpdateManager.shared
    }

    // Returns whether updates are available
    var updatesAvailable: Bool {
        return sparkleAvailable
    }
}
