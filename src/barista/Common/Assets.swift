import AppKit

struct Assets {
    static var expandImage: NSImage? {
        if Constant.isUsingLTRLanguage {
            return NSImage(named: NSImage.Name("ic_expand"))
        } else {
            return NSImage(named: NSImage.Name("ic_collapse"))
        }
    }
    static var collapseImage: NSImage? {
        if Constant.isUsingLTRLanguage {
            return NSImage(named: NSImage.Name("ic_collapse"))
        } else {
            return NSImage(named: NSImage.Name("ic_expand"))
        }
    }
}
