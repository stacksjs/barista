import Foundation

struct GlobalKeybindPreferences: Codable, CustomStringConvertible {
    let function: Bool
    let control: Bool
    let command: Bool
    let shift: Bool
    let option: Bool
    let capsLock: Bool
    let carbonFlags: UInt32
    let characters: String?
    let keyCode: UInt32

    var description: String {
        print(keyCode)
        var stringBuilder = ""
        if self.function {
            stringBuilder += "Fn"
        }
        if self.control {
            stringBuilder += "⌃"
        }
        if self.option {
            stringBuilder += "⌥"
        }
        if self.command {
            stringBuilder += "⌘"
        }
        if self.shift {
            stringBuilder += "⇧"
        }
        if self.capsLock {
            stringBuilder += "⇪"
        }
        if keyCode == 36 { // return
            stringBuilder += "⏎"
            return stringBuilder
        }

        if keyCode == 51 { // delete
            stringBuilder += "⌫"
            return stringBuilder
        }

        if keyCode == 49 { // spacer
            stringBuilder += "⎵"
            return stringBuilder
        }

        if let characters = self.characters {
            stringBuilder += characters.uppercased()
        }

        return "\(stringBuilder)"
    }
}

extension GlobalKeybindPreferences {
    func save() {

    }
}
