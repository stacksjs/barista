import AppKit

extension NSWindow {
    func bringToFront() {
        self.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
}
