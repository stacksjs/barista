import Cocoa

extension NSStackView {
    func removeAllSubViews() {
        for view in self.views {
            view.removeFromSuperview()
        }
    }
}
