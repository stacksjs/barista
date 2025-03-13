import Foundation

extension String {
    // localize
    var localized: String {
        return NSLocalizedString(self, comment: self)
    }
}
