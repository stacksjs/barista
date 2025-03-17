import Foundation

// Add a KeyboardShortcut struct for caffeinate shortcut
struct KeyboardShortcut: Codable {
    let keyCode: UInt32
    let modifierFlags: UInt32
    let characters: String

    var displayString: String {
        var result = ""

        // Add modifier symbols
        if modifierFlags & UInt32(1 << 17) != 0 { result += "⇧" }  // Shift
        if modifierFlags & UInt32(1 << 18) != 0 { result += "⌃" }  // Control
        if modifierFlags & UInt32(1 << 19) != 0 { result += "⌥" }  // Option
        if modifierFlags & UInt32(1 << 20) != 0 { result += "⌘" }  // Command

        // Add the key character
        result += characters.uppercased()

        return result
    }
}

// Add caffeinate settings to UserDefaults.Key
extension UserDefaults.Key {
    static let isCaffeinateEnabled = "isCaffeinateEnabled"
    static let caffeinateDurationMinutes = "caffeinateDurationMinutes"
    static let caffeinateShortcut = "caffeinateShortcut"
}

enum Preferences {
    static var globalKey: GlobalKeybindPreferences? {
        get {
            guard let data = UserDefaults.standard.value(forKey: UserDefaults.Key.globalKey) as? Data else { return nil }
            return try? JSONDecoder().decode(GlobalKeybindPreferences.self, from: data)
        }

        set {
            guard let data = try? JSONEncoder().encode(newValue) else { return }
            UserDefaults.standard.set(data, forKey: UserDefaults.Key.globalKey)

            NotificationCenter.default.post(Notification(name: .prefsChanged))
        }
    }

    static var isAutoStart: Bool {
        get {
            return UserDefaults.standard.bool(forKey: UserDefaults.Key.isAutoStart)
        }

        set {
            UserDefaults.standard.set(newValue, forKey: UserDefaults.Key.isAutoStart)

            Util.setUpAutoStart(isAutoStart: newValue)

            NotificationCenter.default.post(Notification(name: .prefsChanged))
        }
    }

    static var numberOfSecondForAutoHide: Double {
        get {
            UserDefaults.standard.double(forKey: UserDefaults.Key.numberOfSecondForAutoHide)
        }

        set {
            UserDefaults.standard.set(newValue, forKey: UserDefaults.Key.numberOfSecondForAutoHide)

            NotificationCenter.default.post(Notification(name: .prefsChanged))
        }
    }

    static var isAutoHide: Bool {
        get {
            UserDefaults.standard.bool(forKey: UserDefaults.Key.isAutoHide)
        }

        set {
            UserDefaults.standard.set(newValue, forKey: UserDefaults.Key.isAutoHide)

            NotificationCenter.default.post(Notification(name: .prefsChanged))
        }
    }

    static var isShowPreference: Bool {
        get {
            UserDefaults.standard.bool(forKey: UserDefaults.Key.isShowPreference)
        }

        set {
            UserDefaults.standard.set(newValue, forKey: UserDefaults.Key.isShowPreference)

            NotificationCenter.default.post(Notification(name: .prefsChanged))
        }
    }

    static var areSeparatorsHidden: Bool {
        get {
            UserDefaults.standard.bool(forKey: UserDefaults.Key.areSeparatorsHidden)
        }

        set {
            UserDefaults.standard.set(newValue, forKey: UserDefaults.Key.areSeparatorsHidden)
        }
    }

    static var alwaysHiddenSectionEnabled: Bool {
        get {
            UserDefaults.standard.bool(forKey: UserDefaults.Key.alwaysHiddenSectionEnabled)
        }

        set {
            UserDefaults.standard.set(newValue, forKey: UserDefaults.Key.alwaysHiddenSectionEnabled)
            NotificationCenter.default.post(Notification(name: .alwayHideToggle))
        }
    }

    static var isCaffeinateEnabled: Bool {
        get {
            UserDefaults.standard.bool(forKey: UserDefaults.Key.isCaffeinateEnabled)
        }

        set {
            UserDefaults.standard.set(newValue, forKey: UserDefaults.Key.isCaffeinateEnabled)
            NotificationCenter.default.post(Notification(name: .caffeinateSettingsChanged))
        }
    }

    static var caffeinateDurationMinutes: Int {
        get {
            UserDefaults.standard.integer(forKey: UserDefaults.Key.caffeinateDurationMinutes)
        }

        set {
            UserDefaults.standard.set(newValue, forKey: UserDefaults.Key.caffeinateDurationMinutes)
            NotificationCenter.default.post(Notification(name: .caffeinateSettingsChanged))
        }
    }

    static var caffeinateShortcut: KeyboardShortcut? {
        get {
            guard let data = UserDefaults.standard.data(forKey: UserDefaults.Key.caffeinateShortcut) else {
                return nil
            }

            do {
                return try JSONDecoder().decode(KeyboardShortcut.self, from: data)
            } catch {
                print("Failed to decode caffeinate shortcut: \(error)")
                return nil
            }
        }

        set {
            if let shortcut = newValue {
                do {
                    let data = try JSONEncoder().encode(shortcut)
                    UserDefaults.standard.set(data, forKey: UserDefaults.Key.caffeinateShortcut)
                } catch {
                    print("Failed to encode caffeinate shortcut: \(error)")
                }
            } else {
                UserDefaults.standard.removeObject(forKey: UserDefaults.Key.caffeinateShortcut)
            }

            NotificationCenter.default.post(Notification(name: .caffeinateSettingsChanged))
        }
    }
}
