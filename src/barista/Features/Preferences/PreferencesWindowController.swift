import Cocoa

class PreferencesWindowController: NSWindowController {
    enum MenuSegment: Int {
        case general
        case about
    }

    static let shared: PreferencesWindowController = {
        let wc = NSStoryboard(name: "Main", bundle: nil).instantiateController(withIdentifier: "MainWindow") as! PreferencesWindowController
        return wc
    }()

    private var menuSegment: MenuSegment = .general {
        didSet {
            updateVC()
        }
    }

    // We'll load these view controllers lazily to avoid import issues
    private lazy var preferencesVC: NSViewController = {
        return NSStoryboard(name: "Main", bundle: nil).instantiateController(withIdentifier: "prefVC") as! NSViewController
    }()

    private lazy var aboutVC: NSViewController = {
        return NSStoryboard(name: "Main", bundle: nil).instantiateController(withIdentifier: "aboutVC") as! NSViewController
    }()

    override func windowDidLoad() {
        super.windowDidLoad()
        updateVC()

        // Find the segmented control in the toolbar and set its action
        if let toolbar = window?.toolbar,
           let segmentedControlItem = toolbar.items.first(where: { $0.itemIdentifier.rawValue == "F7DA19CF-BC58-47E1-8140-D04939EE4CA7" }),
           let segmentedControl = segmentedControlItem.view as? NSSegmentedControl {
            segmentedControl.target = self
            segmentedControl.action = #selector(switchSegment(_:))
        }
    }

    override func keyDown(with event: NSEvent) {
        super.keyDown(with: event)
        if let vc = self.contentViewController as? PreferencesViewController, vc.listening {
            vc.updateGlobalShortcut(event)
        }
    }

    override func flagsChanged(with event: NSEvent) {
        super.flagsChanged(with: event)
        if let vc = self.contentViewController as? PreferencesViewController, vc.listening {
            vc.updateModiferFlags(event)
        }
    }

    @IBAction func switchSegment(_ sender: NSSegmentedControl) {
        // Get the selected segment index
        let selectedIndex = sender.selectedSegment

        // Convert to MenuSegment enum
        if let segment = MenuSegment(rawValue: selectedIndex) {
            // Set the menuSegment property which will trigger the didSet and call updateVC()
            menuSegment = segment

            // Log for debugging
            print("Switched to segment: \(segment == .general ? "General" : "About"), index: \(selectedIndex)")
        } else {
            print("Invalid segment index: \(selectedIndex)")
        }
    }

    // Public method to switch to the About tab
    @objc func showAboutTab() {
        print("showAboutTab called")

        // Set the menuSegment to .about which will trigger updateVC()
        menuSegment = .about

        // Force update the view controller immediately
        self.contentViewController = aboutVC

        // Update the segmented control in the toolbar
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            if let toolbar = self.window?.toolbar {
                for item in toolbar.items {
                    if item.itemIdentifier.rawValue == "F7DA19CF-BC58-47E1-8140-D04939EE4CA7",
                       let segmentedControl = item.view as? NSSegmentedControl {
                        // Set the selected segment to the About tab
                        segmentedControl.selectedSegment = MenuSegment.about.rawValue
                        print("Updated segmented control to About tab")
                        break
                    }
                }
            }
        }
    }

    private func updateVC() {
        // Log for debugging
        print("Updating view controller to: \(menuSegment == .general ? "General" : "About")")

        // Update the content view controller based on the selected segment
        switch menuSegment {
        case .general:
            if !(self.contentViewController is NSViewController) || self.contentViewController !== preferencesVC {
                self.contentViewController = preferencesVC
            }
        case .about:
            if !(self.contentViewController is NSViewController) || self.contentViewController !== aboutVC {
                self.contentViewController = aboutVC
            }
        }

        // Update the segmented control to match the current tab
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            if let toolbar = self.window?.toolbar {
                for item in toolbar.items {
                    if item.itemIdentifier.rawValue == "F7DA19CF-BC58-47E1-8140-D04939EE4CA7",
                       let segmentedControl = item.view as? NSSegmentedControl {
                        // Set the selected segment to match the current menuSegment
                        segmentedControl.selectedSegment = self.menuSegment.rawValue
                        print("Updated segmented control to: \(self.menuSegment.rawValue)")
                        break
                    }
                }
            }
        }
    }
}
