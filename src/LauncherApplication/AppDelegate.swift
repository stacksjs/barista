import Cocoa

class AppDelegate: NSObject, NSApplicationDelegate {
    @objc func terminate() {
        NSApp.terminate(nil)
    }

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        let mainAppIdentifier = "org.stacksjs.barista"
        let runningApps = NSWorkspace.shared.runningApplications
        let isRunning = !runningApps.filter { $0.bundleIdentifier == mainAppIdentifier }.isEmpty

        if !isRunning {
            DistributedNotificationCenter.default().addObserver(self,
                                                                selector: #selector(self.terminate),
                                                                name: Notification.Name("killLauncher"),
                                                                object: mainAppIdentifier)

            let path = Bundle.main.bundlePath as NSString
            var components = path.pathComponents
            components.removeLast(3)
            components.append("MacOS")
            let appName = "Barista"
            components.append(appName) // main app name
            let newPath = NSString.path(withComponents: components)

            // Replace deprecated launchApplication with modern API
            let url = URL(fileURLWithPath: newPath)
            NSWorkspace.shared.openApplication(at: url, configuration: .init(), completionHandler: nil)
        } else {
            self.terminate()
        }
    }

    func applicationWillTerminate(_ aNotification: Notification) {
        // Insert code here to tear down your application
    }
}
