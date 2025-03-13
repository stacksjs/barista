import Foundation

extension Date {
    static func dateString() -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEE dd MMM"

        return dateFormatter.string(from: Date())
    }

    static func timeString() -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "hh:mm a"

        return dateFormatter.string(from: Date())
    }
}
