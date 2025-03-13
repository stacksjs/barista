import Foundation
import AppKit

extension NSStatusBarButton {
    class func collapseBarButtonItem() -> NSStatusBarButton {
        let btnDot = NSStatusBarButton()
        btnDot.title = ""
        btnDot.sendAction(on: [.leftMouseUp, .rightMouseUp])
        btnDot.frame = NSRect(x: 0, y: 0, width: 24, height: 24)
        return btnDot
    }
}
