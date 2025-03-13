import AppKit
import Foundation
import ServiceManagement

class Util {
    static func setUpAutoStart(isAutoStart: Bool) {
        let runningApps = NSWorkspace.shared.runningApplications
      let isRunning = !runningApps.filter { $0.bundleIdentifier == Constant.launcherAppId }.isEmpty

        // Use SMAppService instead of deprecated SMLoginItemSetEnabled
        if isAutoStart {
            do {
                try SMAppService.mainApp.register()
            } catch {
                print("Failed to register app as login item: \(error)")
            }
        } else {
            do {
                try SMAppService.mainApp.unregister()
            } catch {
                print("Failed to unregister app as login item: \(error)")
            }
        }

        if isRunning, let bundleId = Bundle.main.bundleIdentifier {
            DistributedNotificationCenter.default().post(name: Notification.Name("killLauncher"),
                                                         object: bundleId)
        }
    }

    static func showPrefWindow(showAboutTab: Bool = false) {
        // Get the PreferencesWindowController from the storyboard
        let storyboard = NSStoryboard(name: "Main", bundle: nil)
        if let windowController = storyboard.instantiateController(withIdentifier: "MainWindow") as? NSWindowController {
            // Make sure we're using the same instance each time
            if let existingWindow = NSApp.windows.first(where: { $0.identifier?.rawValue == "MainWindow" }) {
                existingWindow.makeKeyAndOrderFront(nil)

                if showAboutTab {
                    // Try to switch to the About tab
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        if let controller = existingWindow.windowController {
                            let selector = Selector("showAboutTab")
                            if controller.responds(to: selector) {
                                controller.perform(selector)
                            }
                        }
                    }
                }
            } else {
                windowController.window?.makeKeyAndOrderFront(nil)

                if showAboutTab {
                    // Try to switch to the About tab
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        let selector = Selector("showAboutTab")
                        if windowController.responds(to: selector) {
                            windowController.perform(selector)
                        }
                    }
                }
            }
        }
    }
}
