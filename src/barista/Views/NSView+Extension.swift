import Foundation
import AppKit

extension NSView {
    var getOrigin: CGPoint? {
        return self.window?.frame.origin
    }
}
