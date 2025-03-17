import AppKit

class StatusBarController {
    // MARK: - Variables
    private var timer: Timer?
    private var caffeinateProcess: Process?
    private var isCaffeinated: Bool = false
    private var caffeinateTimer: Timer?
    private var caffeinateEndTime: Date?
    private var caffeinateHotKey: Any? // Using Any to avoid direct HotKey dependency
    private var caffeinateStatusItem: NSStatusItem? // Status item for caffeinate icon

    // Store original expand/collapse images to restore them
    private var originalExpandImage: NSImage?
    private var originalCollapseImage: NSImage?

    // MARK: - BarItems

    private let btnExpandCollapse = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let btnSeparate = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private var btnAlwaysHidden: NSStatusItem?
    // Create a dedicated status item for caffeinate that persists throughout app lifecycle
    private let btnCaffeinate = NSStatusBar.system.statusItem(withLength: 28) // Use fixed length for better visibility

    private var btnHiddenLength: CGFloat =  20
    private let btnHiddenCollapseLength: CGFloat = 10000

    private let btnAlwaysHiddenLength: CGFloat = Preferences.alwaysHiddenSectionEnabled ? 20 : 0
    private let btnAlwaysHiddenEnableExpandCollapseLength: CGFloat = Preferences.alwaysHiddenSectionEnabled ? 10000 : 0

    private let imgIconLine = NSImage(named: NSImage.Name("ic_line"))

    // Create a coffee cup icon from the Assets catalog
    private func createCoffeeIcon() -> NSImage {
        // Use the coffee cup icon from Assets.xcassets
        if let coffeeImage = NSImage(named: NSImage.Name("ic_coffee-cup")) {
            // Make sure it's a template image for proper dark/light mode adaptation
            coffeeImage.isTemplate = true
            return coffeeImage
        }

        // Fallback to a simple text-based icon if image loading fails
        let fallbackImage = NSImage(size: NSSize(width: 24, height: 24))
        fallbackImage.lockFocus()

        // Draw a simple text-based coffee emoji as fallback
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .center

        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 18),
            .foregroundColor: NSColor.black,
            .paragraphStyle: paragraphStyle
        ]

        "☕".draw(in: NSRect(x: 0, y: 0, width: 24, height: 24), withAttributes: attributes)

        fallbackImage.unlockFocus()
        fallbackImage.isTemplate = true
        return fallbackImage
    }

    private var isCollapsed: Bool {
        return self.btnSeparate.length == self.btnHiddenCollapseLength
    }

    private var isBtnSeparateValidPosition: Bool {
        guard
            let btnExpandCollapseX = self.btnExpandCollapse.button?.getOrigin?.x,
            let btnSeparateX = self.btnSeparate.button?.getOrigin?.x
            else {return false}

        if Constant.isUsingLTRLanguage {
            return btnExpandCollapseX >= btnSeparateX
        } else {
            return btnExpandCollapseX <= btnSeparateX
        }
    }

    private var isBtnAlwaysHiddenValidPosition: Bool {
        if !Preferences.alwaysHiddenSectionEnabled { return true }

        guard
            let btnSeparateX = self.btnSeparate.button?.getOrigin?.x,
            let btnAlwaysHiddenX = self.btnAlwaysHidden?.button?.getOrigin?.x
            else {return false}

        if Constant.isUsingLTRLanguage {
            return btnSeparateX >= btnAlwaysHiddenX
        } else {
            return btnSeparateX <= btnAlwaysHiddenX
        }
    }

    private var isToggle = false

    // MARK: - Methods
    init() {
        setupUI()
        setupAlwayHideStatusBar()
        setupCaffeinate()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1, execute: {
            self.collapseMenuBar()
        })

        if Preferences.areSeparatorsHidden {hideSeparators()}
        autoCollapseIfNeeded()

        // Listen for caffeinate settings changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleCaffeinateSettingsChanged),
            name: .caffeinateSettingsChanged,
            object: nil
        )
    }

    private func setupUI() {
        if let button = btnSeparate.button {
            button.image = self.imgIconLine
            button.imagePosition = .imageOnly
        }

        // Store original images for later use
        if let expandImage = Assets.expandImage {
            originalExpandImage = expandImage
        }
        if let collapseImage = Assets.collapseImage {
            originalCollapseImage = collapseImage
        }

        // Setup the caffeinate button with a simpler, more visible approach
        if let button = btnCaffeinate.button {
            // Use a simple text-based icon initially
            button.title = "☕"
            button.font = NSFont.systemFont(ofSize: 18)
            button.action = #selector(toggleCaffeinate)
            button.target = self

            // Add the same context menu to the caffeinate button
            btnCaffeinate.menu = self.getContextMenu()

            // Set autosave name for position persistence
            btnCaffeinate.autosaveName = "barista_caffeinate"

            // Hide it initially
            btnCaffeinate.length = 0
        }

        let menu = self.getContextMenu()
        btnSeparate.menu = menu

        updateAutoCollapseMenuTitle()

        if let button = btnExpandCollapse.button {
            button.image = Assets.collapseImage
            button.target = self
            button.action = #selector(self.btnExpandCollapsePressed(sender:))
            // Send both left and right mouse events to our action method
            button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }

        // We'll set the menu dynamically on right-click instead of here
        // btnExpandCollapse.menu = menu

        btnExpandCollapse.autosaveName = "barista_expandcollapse"
        btnSeparate.autosaveName = "barista_separate"
    }

    @objc func btnExpandCollapsePressed(sender: NSStatusBarButton) {
        if let event = NSApp.currentEvent {
            let isOptionKeyPressed = event.modifierFlags.contains(NSEvent.ModifierFlags.option)

            if event.type == NSEvent.EventType.rightMouseUp {
                // For right-click, show the context menu
                let menu = self.getContextMenu()
                menu.popUp(positioning: nil, at: NSPoint(x: 0, y: 0), in: sender)
            } else if isOptionKeyPressed {
                self.showHideSeparatorsAndAlwayHideArea()
            } else {
                self.expandCollapseIfNeeded()
            }
        }
    }

    func showHideSeparatorsAndAlwayHideArea() {
        Preferences.areSeparatorsHidden ? self.showSeparators() : self.hideSeparators()

        if self.isCollapsed {self.expandMenubar()}
    }

    private func showSeparators() {
        Preferences.areSeparatorsHidden = false

        if !self.isCollapsed {
            self.btnSeparate.length = self.btnHiddenLength
        }
        self.btnAlwaysHidden?.length = self.btnAlwaysHiddenLength
    }

    private func hideSeparators() {
        guard self.isBtnAlwaysHiddenValidPosition else {return}

        Preferences.areSeparatorsHidden = true

        if !self.isCollapsed {
            self.btnSeparate.length = self.btnHiddenLength
        }
        self.btnAlwaysHidden?.length = self.btnAlwaysHiddenEnableExpandCollapseLength
    }

    func expandCollapseIfNeeded() {
        // prevented rapid click cause icon show many in Dock
        if isToggle {return}
        isToggle = true
        self.isCollapsed ? self.expandMenubar() : self.collapseMenuBar()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            self.isToggle = false
        }
    }

    private func collapseMenuBar() {
        guard !self.isCollapsed else {return}
        btnSeparate.length = 0
        if let button = btnExpandCollapse.button {
            // Use coffee cup icon if caffeinate is active, otherwise use normal expand icon
            if isCaffeinated {
                updateExpandCollapseButtonForCaffeinate(isCollapsed: true)
            } else {
                button.image = Assets.expandImage
            }
        }
    }

    private func expandMenubar() {
        guard self.isCollapsed else {return}
        btnSeparate.length = btnHiddenLength
        if let button = btnExpandCollapse.button {
            // Use coffee cup icon if caffeinate is active, otherwise use normal collapse icon
            if isCaffeinated {
                updateExpandCollapseButtonForCaffeinate(isCollapsed: false)
            } else {
                button.image = Assets.collapseImage
            }
        }
        autoCollapseIfNeeded()
    }

    private func autoCollapseIfNeeded() {
        guard Preferences.isAutoHide else {return}
        guard !isCollapsed else { return }

        startTimerToAutoHide()
    }

    private func startTimerToAutoHide() {
        timer?.invalidate()
        self.timer = Timer.scheduledTimer(withTimeInterval: Preferences.numberOfSecondForAutoHide, repeats: false) { [weak self] _ in
            DispatchQueue.main.async {
                if Preferences.isAutoHide {
                    self?.collapseMenuBar()
                }
            }
        }
    }

    private func getContextMenu() -> NSMenu {
        let menu = NSMenu()

        // FIRST GROUP: Caffeinate and Auto Collapse

        // Add caffeinate toggle
        let caffeinateTitle = isCaffeinated ? "Disable Caffeinate".localized : "Enable Caffeinate".localized
        let caffeinateItem = NSMenuItem(title: caffeinateTitle, action: #selector(toggleCaffeinate), keyEquivalent: "C")
        caffeinateItem.target = self
        menu.addItem(caffeinateItem)

        // Add caffeinate submenu
        let caffeinateMenu = NSMenu()

        // Add duration options
        let durationItems = [
            NSMenuItem(title: "15 minutes", action: #selector(setCaffeinateDuration15), keyEquivalent: "1"),
            NSMenuItem(title: "30 minutes", action: #selector(setCaffeinateDuration30), keyEquivalent: "2"),
            NSMenuItem(title: "45 minutes", action: #selector(setCaffeinateDuration45), keyEquivalent: "3"),
            NSMenuItem(title: "1 hour", action: #selector(setCaffeinateDuration60), keyEquivalent: "4"),
            NSMenuItem(title: "4 hours", action: #selector(setCaffeinateDuration240), keyEquivalent: "5"),
            NSMenuItem(title: "8 hours", action: #selector(setCaffeinateDuration480), keyEquivalent: "6"),
            NSMenuItem(title: "12 hours", action: #selector(setCaffeinateDuration720), keyEquivalent: "7"),
            NSMenuItem(title: "Indefinitely", action: #selector(setCaffeinateDurationIndefinite), keyEquivalent: "8")
        ]

        for item in durationItems {
            item.target = self
            caffeinateMenu.addItem(item)
        }

        // Add status item if caffeinate is active
        if isCaffeinated {
            caffeinateMenu.addItem(NSMenuItem.separator())

            let statusItem: NSMenuItem
            if let endTime = caffeinateEndTime {
                let formatter = DateFormatter()
                formatter.dateFormat = "h:mm a"
                let timeString = formatter.string(from: endTime)
                statusItem = NSMenuItem(title: "Active until \(timeString)", action: nil, keyEquivalent: "")
            } else {
                statusItem = NSMenuItem(title: "Active indefinitely", action: nil, keyEquivalent: "")
            }
            statusItem.isEnabled = false
            caffeinateMenu.addItem(statusItem)
        }

        // Set the caffeinate submenu
        menu.setSubmenu(caffeinateMenu, for: caffeinateItem)

        // Add Auto Collapse toggle
        let autoCollapseTitle = Preferences.isAutoHide ? "Disable Auto Collapse".localized : "Enable Auto Collapse".localized
        let toggleAutoHideItem = NSMenuItem(title: autoCollapseTitle, action: #selector(toggleAutoHide), keyEquivalent: "t")
        toggleAutoHideItem.target = self
        toggleAutoHideItem.tag = 1
        menu.addItem(toggleAutoHideItem)

        // Add separator between groups
        menu.addItem(NSMenuItem.separator())

        // SECOND GROUP: About and Preferences

        let aboutItem = NSMenuItem(title: "About".localized, action: #selector(showAboutTab), keyEquivalent: "A")
        aboutItem.target = self
        menu.addItem(aboutItem)

        // Add "Check for Updates..." menu item
        let updateMenuItem = NSMenuItem(
            title: NSLocalizedString("Check for Updates...", comment: "Menu item title for checking updates"),
            action: #selector(checkForUpdates),
            keyEquivalent: "U"
        )
        updateMenuItem.target = self
        menu.addItem(updateMenuItem)

        let prefItem = NSMenuItem(title: "Preferences...".localized, action: #selector(openPreferenceViewControllerIfNeeded), keyEquivalent: "P")
        prefItem.target = self
        menu.addItem(prefItem)

        // Add separator before Quit
        menu.addItem(NSMenuItem.separator())

        // LAST ITEM: Quit
        menu.addItem(NSMenuItem(title: "Quit".localized, action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))

        // Set up notification observer for preference changes
        NotificationCenter.default.addObserver(self, selector: #selector(updateAutoHide), name: .prefsChanged, object: nil)

        return menu
    }

    private func updateAutoCollapseMenuTitle() {
        guard let toggleAutoHideItem = btnSeparate.menu?.item(withTag: 1) else { return }
        if Preferences.isAutoHide {
            toggleAutoHideItem.title = "Disable Auto Collapse".localized
        } else {
            toggleAutoHideItem.title = "Enable Auto Collapse".localized
        }
    }

    @objc func updateAutoHide() {
        updateAutoCollapseMenuTitle()
        autoCollapseIfNeeded()
    }

    @objc func openPreferenceViewControllerIfNeeded() {
        Util.showPrefWindow()
    }

    @objc func toggleAutoHide() {
        Preferences.isAutoHide.toggle()
    }

    @objc func showAboutTab() {
        // Show the preferences window with the About tab
        Util.showPrefWindow(showAboutTab: true)
    }

    @objc func toggleCaffeinate() {
        if isCaffeinated {
            disableCaffeinate()
        } else {
            enableCaffeinate()
        }

        // Update the menu to reflect the new state
        updateMenus()
    }

    // MARK: - Caffeinate Methods
    private func setupCaffeinate() {
        // Check if caffeinate should be enabled on startup
        if Preferences.isCaffeinateEnabled {
            enableCaffeinate()
        }

        // Setup caffeinate shortcut
        setupCaffeinateShortcut()
    }

    private func setupCaffeinateShortcut() {
        // Remove existing shortcut if any
        caffeinateHotKey = nil

        // Setup new shortcut if available
        if let shortcut = Preferences.caffeinateShortcut {
            // This would typically use HotKey, but we're using a generic approach here
            // In a real implementation, you would create a HotKey instance
            print("Setting up caffeinate shortcut: \(shortcut.displayString)")
        }
    }

    @objc func handleCaffeinateSettingsChanged() {
        // Update caffeinate state based on preferences
        if Preferences.isCaffeinateEnabled && !isCaffeinated {
            enableCaffeinate()
        } else if !Preferences.isCaffeinateEnabled && isCaffeinated {
            disableCaffeinate()
        }

        // Update caffeinate shortcut
        setupCaffeinateShortcut()

        // Update menus
        updateMenus()
    }

    private func updateMenus() {
        // Recreate the menu with updated state
        let newMenu = getContextMenu()
        btnSeparate.menu = newMenu

        // Update the always hidden button menu if it exists
        if let _ = btnAlwaysHidden?.menu {
            btnAlwaysHidden?.menu = newMenu
        }

        // Update the caffeinate status item
        updateCaffeinateStatusItem()
    }

    // Update the status bar with the caffeinate icon
    private func updateCaffeinateStatusItem() {
        print("Updating caffeinate status item - current state: isCaffeinated = \(isCaffeinated)")

        // Update the expand/collapse button to show caffeinate status
        updateExpandCollapseButtonForCaffeinate(isCollapsed: isCollapsed)

        // Verify all status items in the status bar
        print("Current status items: main = \(btnExpandCollapse.length), separate = \(btnSeparate.length)")
    }

    // Helper method to update the expand/collapse button based on caffeinate state
    private func updateExpandCollapseButtonForCaffeinate(isCollapsed: Bool) {
        guard let button = btnExpandCollapse.button else { return }

        if isCaffeinated {
            // Create a coffee cup icon
            let coffeeImage = createCoffeeIcon()

            // Set the image based on collapsed state
            button.image = coffeeImage

            // Update tooltip to show caffeinate status
            if let endTime = caffeinateEndTime {
                let formatter = DateFormatter()
                formatter.dateFormat = "h:mm a"
                let timeString = formatter.string(from: endTime)
                button.toolTip = "Caffeinate active until \(timeString)"
            } else {
                button.toolTip = "Caffeinate active indefinitely"
            }

            print("Updated expand/collapse button with coffee icon")
        } else {
            // Restore original image based on collapsed state
            button.image = isCollapsed ? Assets.expandImage : Assets.collapseImage
            button.toolTip = isCollapsed ? "Expand" : "Collapse"
            print("Restored original expand/collapse button image")
        }
    }

    private func enableCaffeinate() {
        print("Enabling caffeinate...")

        // Cancel any existing caffeinate process
        disableCaffeinate()

        // Create a Process to run the caffeinate command
        let process = Process()
        process.launchPath = "/usr/bin/caffeinate"

        // Get the duration from preferences
        let durationMinutes = Preferences.caffeinateDurationMinutes
        print("Using duration: \(durationMinutes) minutes")

        // Set up arguments based on duration
        if durationMinutes > 0 {
            // Set a specific duration
            process.arguments = ["-disu", "-t", "\(durationMinutes * 60)"]
            print("Setting caffeinate with args: \(process.arguments ?? [])")

            // Calculate end time for display
            let endTime = Date().addingTimeInterval(TimeInterval(durationMinutes * 60))
            caffeinateEndTime = endTime

            // Set up a timer to update the menu when caffeinate ends
            caffeinateTimer = Timer.scheduledTimer(withTimeInterval: TimeInterval(durationMinutes * 60), repeats: false) { [weak self] _ in
                print("Caffeinate timer expired")
                self?.disableCaffeinate()
                self?.updateMenus()
            }
        } else {
            // Run indefinitely
            process.arguments = ["-disu"]
            print("Setting caffeinate to run indefinitely")
            caffeinateEndTime = nil
        }

        // Launch the process
        do {
            try process.run()
            caffeinateProcess = process
            isCaffeinated = true

            // Set the preference to match our state
            Preferences.isCaffeinateEnabled = true

            // Update the expand/collapse button to show caffeinate status
            updateCaffeinateStatusItem()

            print("Caffeinate enabled with duration: \(durationMinutes) minutes, isCaffeinated = \(isCaffeinated), process running = \(process.isRunning)")
        } catch {
            print("Failed to enable caffeinate: \(error)")
            // Reset state in case of failure
            isCaffeinated = false
            Preferences.isCaffeinateEnabled = false
        }
    }

    private func disableCaffeinate() {
        // Terminate the caffeinate process if it exists
        if let process = caffeinateProcess, process.isRunning {
            process.terminate()
            caffeinateProcess = nil
        }

        // Invalidate the timer if it exists
        caffeinateTimer?.invalidate()
        caffeinateTimer = nil

        // Reset state
        isCaffeinated = false
        caffeinateEndTime = nil

        // Update the preference to match our state
        Preferences.isCaffeinateEnabled = false

        // Update the expand/collapse button to remove caffeinate status
        updateCaffeinateStatusItem()

        print("Caffeinate disabled, isCaffeinated = \(isCaffeinated)")
    }

    // Duration shortcut methods
    @objc func setCaffeinateDuration15() { setCaffeinateDuration(15) }
    @objc func setCaffeinateDuration30() { setCaffeinateDuration(30) }
    @objc func setCaffeinateDuration45() { setCaffeinateDuration(45) }
    @objc func setCaffeinateDuration60() { setCaffeinateDuration(60) }
    @objc func setCaffeinateDuration240() { setCaffeinateDuration(240) }
    @objc func setCaffeinateDuration480() { setCaffeinateDuration(480) }
    @objc func setCaffeinateDuration720() { setCaffeinateDuration(720) }
    @objc func setCaffeinateDurationIndefinite() { setCaffeinateDuration(-1) }

    private func setCaffeinateDuration(_ minutes: Int) {
        print("Setting caffeinate duration to \(minutes) minutes")

        // Save the duration preference
        Preferences.caffeinateDurationMinutes = minutes

        // Always enable caffeinate when a duration is selected
        // This ensures that selecting a duration from the menu will activate caffeinate
        enableCaffeinate()

        // Update the menu to reflect the new state
        updateMenus()

        print("After setting duration: isCaffeinated = \(isCaffeinated), status item exists = \(caffeinateStatusItem != nil)")
    }

    // Make sure to terminate the caffeinate process when the app is terminated
    deinit {
        disableCaffeinate()
    }

    @objc func checkForUpdates(_ sender: Any) {
        // Forward the check for updates action to the app delegate
        if let appDelegate = NSApp.delegate as? AppDelegate {
            appDelegate.checkForUpdates(sender)
        }
    }
}

// MARK: - Always hide feature
extension StatusBarController {
    private func setupAlwayHideStatusBar() {
        NotificationCenter.default.addObserver(self, selector: #selector(toggleStatusBarIfNeeded), name: .alwayHideToggle, object: nil)
        toggleStatusBarIfNeeded()
    }
    @objc private func toggleStatusBarIfNeeded() {
        if Preferences.alwaysHiddenSectionEnabled {
            self.btnAlwaysHidden =  NSStatusBar.system.statusItem(withLength: 20)
            if let button = btnAlwaysHidden?.button {
                button.image = self.imgIconLine
                button.appearsDisabled = true
            }
            // Add the same context menu to the always hidden button
            btnAlwaysHidden?.menu = self.getContextMenu()
            self.btnAlwaysHidden?.autosaveName = "barista_terminate"
        } else {
            self.btnAlwaysHidden = nil
        }
    }
}
