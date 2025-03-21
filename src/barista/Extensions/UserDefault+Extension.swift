import Foundation

extension UserDefaults {
    enum Key {
        static let globalKey = "globalKey"
        static let numberOfSecondForAutoHide = "numberOfSecondForAutoHide"
        static let isAutoStart = "isAutoStart"
        static let isAutoHide = "isAutoHide"
        static let isShowPreference = "isShowPreferences"
        static let areSeparatorsHidden = "areSeparatorsHidden"
        static let alwaysHiddenSectionEnabled = "alwaysHiddenSectionEnabled"
        static let useFullStatusBarOnExpandEnabled = "useFullStatusBarOnExpandEnabled"
    }

    open override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        print("hi!")
    }
}
