import Foundation

enum SelectedSecond: Int {
       case fiveSeconds = 0
       case tenSeconds = 1
       case fifteenSeconds = 2
       case thirtySeconds = 3
       case oneMinus = 4

       func toSeconds() -> Double {
           switch self {
           case .fiveSeconds:
               return 5.0
           case .tenSeconds:
               return 10.0
           case .fifteenSeconds:
               return 15.0
           case .thirtySeconds:
               return 30.0
           case .oneMinus:
               return 60.0
           }
       }

       static func secondToPosition(seconds: Double) -> Int {
           switch seconds {
           case 10.0:
               return 1
           case 15.0:
               return 2
           case 30.0:
               return 3
           case 60.0:
               return 4
           default:
               return 0
           }
       }
   }
