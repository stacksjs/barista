import Cocoa
import Carbon
import HotKey

// Add an enum for caffeinate duration options
enum CaffeinateDuration: Int {
    case minutes15 = 0
    case minutes30 = 1
    case minutes45 = 2
    case hour1 = 3
    case hours4 = 4
    case hours8 = 5
    case hours12 = 6
    case indefinite = 7

    func toMinutes() -> Int {
        switch self {
        case .minutes15: return 15
        case .minutes30: return 30
        case .minutes45: return 45
        case .hour1: return 60
        case .hours4: return 240
        case .hours8: return 480
        case .hours12: return 720
        case .indefinite: return -1 // Special value for indefinite
        }
    }

    static func fromMinutes(_ minutes: Int) -> CaffeinateDuration {
        switch minutes {
        case 15: return .minutes15
        case 30: return .minutes30
        case 45: return .minutes45
        case 60: return .hour1
        case 240: return .hours4
        case 480: return .hours8
        case 720: return .hours12
        default: return minutes < 0 ? .indefinite : .minutes30
        }
    }
}

class PreferencesViewController: NSViewController {
    // MARK: - Outlets
    @IBOutlet weak var checkBoxKeepLastState: NSButton!
    @IBOutlet weak var textFieldTitle: NSTextField!
    @IBOutlet weak var imageViewTop: NSImageView!

    @IBOutlet weak var statusBarStackView: NSStackView!
    @IBOutlet weak var arrowPointToHiddenImage: NSImageView!
    @IBOutlet weak var arrowPointToAlwayHiddenImage: NSImageView!
    @IBOutlet weak var lblAlwayHidden: NSTextField!

    @IBOutlet weak var checkBoxAutoHide: NSButton!
    @IBOutlet weak var checkBoxKeepInDock: NSButton!
    @IBOutlet weak var checkBoxLogin: NSButton!
    @IBOutlet weak var checkBoxShowPreferences: NSButton!
    @IBOutlet weak var checkBoxShowAlwaysHiddenSection: NSButton!

    @IBOutlet weak var checkBoxUseFullStatusbar: NSButton!
    @IBOutlet weak var timePopup: NSPopUpButton!

    @IBOutlet weak var btnClear: NSButton!
    @IBOutlet weak var btnShortcut: NSButton!

    // New outlets for caffeinate settings
    @IBOutlet weak var checkBoxEnableCaffeinate: NSButton!
    @IBOutlet weak var caffeinateDurationPopup: NSPopUpButton!
    @IBOutlet weak var caffeinateShortcutButton: NSButton!

    private var isListeningForCaffeinateShortcut = false

    public var listening = false {
        didSet {
            let isHighlight = listening

            DispatchQueue.main.async { [weak self] in
                self?.btnShortcut.highlight(isHighlight)
            }
        }
    }

    // MARK: - VC Life cycle
    override func viewDidLoad() {
        super.viewDidLoad()
        updateData()
        loadHotkey()
        setupCaffeinateUI()
        NotificationCenter.default.addObserver(self, selector: #selector(updateData), name: .prefsChanged, object: nil)
    }

    static func initWithStoryboard() -> PreferencesViewController {
        let vc = NSStoryboard(name: "Main", bundle: nil).instantiateController(withIdentifier: "prefVC") as! PreferencesViewController
        return vc
    }

    // MARK: - Caffeinate Setup
    private func setupCaffeinateUI() {
        // Setup the caffeinate checkbox
        if let checkBox = checkBoxEnableCaffeinate {
            checkBox.state = Preferences.isCaffeinateEnabled ? .on : .off
        }

        // Setup the caffeinate duration popup
        if let popup = caffeinateDurationPopup {
            // Populate the popup with duration options
            popup.removeAllItems()
            popup.addItem(withTitle: "15 minutes")
            popup.addItem(withTitle: "30 minutes")
            popup.addItem(withTitle: "45 minutes")
            popup.addItem(withTitle: "1 hour")
            popup.addItem(withTitle: "4 hours")
            popup.addItem(withTitle: "8 hours")
            popup.addItem(withTitle: "12 hours")
            popup.addItem(withTitle: "Indefinitely")

            // Set the selected item based on the saved preference
            let duration = CaffeinateDuration.fromMinutes(Preferences.caffeinateDurationMinutes)
            popup.selectItem(at: duration.rawValue)
            popup.isEnabled = Preferences.isCaffeinateEnabled
        }

        // Setup the caffeinate shortcut button
        if let button = caffeinateShortcutButton {
            if let shortcut = Preferences.caffeinateShortcut {
                button.title = shortcut.displayString
            } else {
                button.title = "Set Shortcut"
            }
        }
    }

    // MARK: - Actions
    @IBAction func loginCheckChanged(_ sender: NSButton) {
        Preferences.isAutoStart = sender.state == .on
    }

    @IBAction func autoHideCheckChanged(_ sender: NSButton) {
        Preferences.isAutoHide = sender.state == .on
    }

    @IBAction func showPreferencesChanged(_ sender: NSButton) {
        Preferences.isShowPreference = sender.state == .on
    }

    @IBAction func showAlwaysHiddenSectionChanged(_ sender: NSButton) {
        Preferences.alwaysHiddenSectionEnabled = sender.state == .on
    }

    @IBAction func useFullStatusBarOnExpandChanged(_ sender: NSButton) {
        Preferences.useFullStatusBarOnExpandEnabled = sender.state == .on
    }

    @IBAction func timePopupDidSelected(_ sender: NSPopUpButton) {
        let selectedIndex = sender.indexOfSelectedItem
        if let selectedInSecond = SelectedSecond(rawValue: selectedIndex)?.toSeconds() {
            Preferences.numberOfSecondForAutoHide = selectedInSecond
        }
    }

    // New actions for caffeinate settings
    @IBAction func enableCaffeinateChanged(_ sender: NSButton) {
        Preferences.isCaffeinateEnabled = sender.state == .on
        caffeinateDurationPopup?.isEnabled = sender.state == .on

        // Notify the status bar controller to update the caffeinate state
        NotificationCenter.default.post(name: .caffeinateSettingsChanged, object: nil)
    }

    @IBAction func caffeinateDurationChanged(_ sender: NSPopUpButton) {
        let selectedIndex = sender.indexOfSelectedItem
        if let duration = CaffeinateDuration(rawValue: selectedIndex) {
            Preferences.caffeinateDurationMinutes = duration.toMinutes()

            // Notify the status bar controller to update the caffeinate state
            NotificationCenter.default.post(name: .caffeinateSettingsChanged, object: nil)
        }
    }

    @IBAction func setCaffeinateShortcut(_ sender: NSButton) {
        isListeningForCaffeinateShortcut = true
        sender.title = "Press keys..."
    }

    // Method to handle key events for caffeinate shortcut
    func updateCaffeinateShortcut(_ event: NSEvent) {
        isListeningForCaffeinateShortcut = false

        guard let characters = event.charactersIgnoringModifiers else { return }

        let shortcut = KeyboardShortcut(
            keyCode: UInt32(event.keyCode),
            modifierFlags: event.modifierFlags.carbonFlags,
            characters: characters
        )

        Preferences.caffeinateShortcut = shortcut
        caffeinateShortcutButton?.title = shortcut.displayString

        // Notify the status bar controller to update the caffeinate shortcut
        NotificationCenter.default.post(name: .caffeinateSettingsChanged, object: nil)
    }

    // When the set shortcut button is pressed start listening for the new shortcut
    @IBAction func register(_ sender: Any) {
        listening = true
        view.window?.makeFirstResponder(nil)
    }

    // If the shortcut is cleared, clear the UI and tell AppDelegate to stop listening to the previous keybind.
    @IBAction func unregister(_ sender: Any?) {
        guard let appDelegate = NSApplication.shared.delegate as? AppDelegate else { return }
        appDelegate.hotKey = nil
        btnShortcut.title = "Set Shortcut".localized
        listening = false
        btnClear.isEnabled = false

        // Remove globalkey from userdefault
        Preferences.globalKey = nil
    }

    public func updateGlobalShortcut(_ event: NSEvent) {
        // If we're listening for a caffeinate shortcut, handle that instead
        if isListeningForCaffeinateShortcut {
            updateCaffeinateShortcut(event)
            return
        }

        self.listening = false

        guard let characters = event.charactersIgnoringModifiers else {return}

        let newGlobalKeybind = GlobalKeybindPreferences(
            function: event.modifierFlags.contains(.function),
            control: event.modifierFlags.contains(.control),
            command: event.modifierFlags.contains(.command),
            shift: event.modifierFlags.contains(.shift),
            option: event.modifierFlags.contains(.option),
            capsLock: event.modifierFlags.contains(.capsLock),
            carbonFlags: event.modifierFlags.carbonFlags,
            characters: characters,
            keyCode: uint32(event.keyCode))

        Preferences.globalKey = newGlobalKeybind

        updateKeybindButton(newGlobalKeybind)
        btnClear.isEnabled = true

        guard let appDelegate = NSApplication.shared.delegate as? AppDelegate else { return }
        appDelegate.hotKey = HotKey(keyCombo: KeyCombo(carbonKeyCode: UInt32(event.keyCode), carbonModifiers: event.modifierFlags.carbonFlags))
    }

    public func updateModiferFlags(_ event: NSEvent) {
        let newGlobalKeybind = GlobalKeybindPreferences(
            function: event.modifierFlags.contains(.function),
            control: event.modifierFlags.contains(.control),
            command: event.modifierFlags.contains(.command),
            shift: event.modifierFlags.contains(.shift),
            option: event.modifierFlags.contains(.option),
            capsLock: event.modifierFlags.contains(.capsLock),
            carbonFlags: 0,
            characters: nil,
            keyCode: uint32(event.keyCode))

        updateModifierbindButton(newGlobalKeybind)
    }

    @objc private func updateData() {
        checkBoxUseFullStatusbar.state = Preferences.useFullStatusBarOnExpandEnabled ? .on : .off
        checkBoxLogin.state = Preferences.isAutoStart ? .on : .off
        checkBoxAutoHide.state = Preferences.isAutoHide ? .on : .off
        checkBoxShowPreferences.state = Preferences.isShowPreference ? .on : .off
        checkBoxShowAlwaysHiddenSection.state = Preferences.alwaysHiddenSectionEnabled ? .on : .off
        timePopup.selectItem(at: SelectedSecond.secondToPosition(seconds: Preferences.numberOfSecondForAutoHide))
    }

    private func loadHotkey() {
        if let globalKey = Preferences.globalKey {
            updateKeybindButton(globalKey)
            updateClearButton(globalKey)
        }
    }

    // Set the shortcut button to show the keys to press
    private func updateKeybindButton(_ globalKeybindPreference: GlobalKeybindPreferences) {
        btnShortcut.title = globalKeybindPreference.description

        if globalKeybindPreference.description.count <= 1 {
            unregister(nil)
        }
    }

    // Set the shortcut button to show the modifier to press
      private func updateModifierbindButton(_ globalKeybindPreference: GlobalKeybindPreferences) {
          btnShortcut.title = globalKeybindPreference.description

          if globalKeybindPreference.description.isEmpty {
              unregister(nil)
          }
      }

    // If a keybind is set, allow users to clear it by enabling the clear button.
    private func updateClearButton(_ globalKeybindPreference: GlobalKeybindPreferences?) {
        btnClear.isEnabled = globalKeybindPreference != nil
    }
}

// MARK: - Show tutorial
extension PreferencesViewController {
    func hideStatusBar() {
        lblAlwayHidden.isHidden = true
        let imageWidth: CGFloat = 16

        // Use the actual menu bar icons that are used in the app
        let images = ["separator", "ic_collapse"].compactMap { imageName -> NSImageView? in
            guard let image = NSImage(named: imageName) else { return nil }
            let imageView = NSImageView(image: image)

            // Apply proper tinting to match the menu bar appearance
            if #available(OSX 10.14, *) {
                imageView.contentTintColor = .labelColor
            }

            return imageView
        }

        // Add proper spacing between items
        statusBarStackView.spacing = 8

        for image in images {
            statusBarStackView.addArrangedSubview(image)
            image.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                image.widthAnchor.constraint(equalToConstant: imageWidth),
                image.heightAnchor.constraint(equalToConstant: imageWidth)
            ])
        }

        let dateTimeLabel = NSTextField()
        dateTimeLabel.stringValue = Date.dateString() + " " + Date.timeString()
        dateTimeLabel.translatesAutoresizingMaskIntoConstraints = false
        dateTimeLabel.isBezeled = false
        dateTimeLabel.isEditable = false
        dateTimeLabel.sizeToFit()
        dateTimeLabel.backgroundColor = .clear
        statusBarStackView.addArrangedSubview(dateTimeLabel)
        NSLayoutConstraint.activate([dateTimeLabel.heightAnchor.constraint(equalToConstant: imageWidth)
        ])

        // Improve the arrow positioning
        NSLayoutConstraint.activate([
            arrowPointToHiddenImage.centerXAnchor.constraint(equalTo: statusBarStackView.arrangedSubviews[3].centerXAnchor)
        ])
    }

    func alwayHideStatusBar() {
        lblAlwayHidden.isHidden = false
        arrowPointToAlwayHiddenImage.isHidden = false
        statusBarStackView.removeAllSubViews()
        let imageWidth: CGFloat = 16

        // Use the actual menu bar icons that are used in the app
        let images = ["separator_1", "separator", "ic_collapse"].compactMap { imageName -> NSImageView? in
            guard let image = NSImage(named: imageName) else { return nil }
            let imageView = NSImageView(image: image)
            // Apply proper tinting to match the menu bar appearance
            if #available(OSX 10.14, *) {
                imageView.contentTintColor = .labelColor
            }
            return imageView
        }

        // Add proper spacing between items
        statusBarStackView.spacing = 8

        for image in images {
            statusBarStackView.addArrangedSubview(image)
            image.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                image.widthAnchor.constraint(equalToConstant: imageWidth),
                image.heightAnchor.constraint(equalToConstant: imageWidth)
            ])
        }

        let dateTimeLabel = NSTextField()
        dateTimeLabel.stringValue = Date.dateString() + " " + Date.timeString()
        dateTimeLabel.translatesAutoresizingMaskIntoConstraints = false
        dateTimeLabel.isBezeled = false
        dateTimeLabel.isEditable = false
        dateTimeLabel.sizeToFit()
        dateTimeLabel.backgroundColor = .clear
        statusBarStackView.addArrangedSubview(dateTimeLabel)

        NSLayoutConstraint.activate([dateTimeLabel.heightAnchor.constraint(equalToConstant: imageWidth)
        ])

        // Improve the arrow positioning
        NSLayoutConstraint.activate([
            arrowPointToAlwayHiddenImage.centerXAnchor.constraint(equalTo: statusBarStackView.arrangedSubviews[4].centerXAnchor)
        ])

        NSLayoutConstraint.activate([
            arrowPointToHiddenImage.centerXAnchor.constraint(equalTo: statusBarStackView.arrangedSubviews[7].centerXAnchor)
        ])
    }

    @IBAction func btnAlwayHiddenHelpPressed(_ sender: NSButton) {
        self.showHowToUseAlwayHiddenPopover(sender: sender)
    }

    private func showHowToUseAlwayHiddenPopover(sender: NSButton) {
        let controller = NSViewController()
        let label = NSTextField()
        let text = NSLocalizedString("Tutorial text", comment: "Step by step tutorial")

        label.stringValue = text
        label.isBezeled = false
        label.isEditable = false
        let view = NSView()
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.topAnchor.constraint(equalTo: view.topAnchor),
            label.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            label.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            label.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        label.translatesAutoresizingMaskIntoConstraints = false
        controller.view = view

        let popover = NSPopover()
        popover.contentViewController = controller
        popover.contentSize = controller.view.frame.size

        popover.behavior = .transient
        popover.animates = true

        popover.show(relativeTo: self.view.bounds, of: sender, preferredEdge: NSRectEdge.maxX)
    }
}
