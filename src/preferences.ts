/**
 * Everything Barista remembers between launches.
 *
 * The store itself is created by `createMenuBarApp` from these defaults and
 * persisted to `~/Library/Application Support/barista/`.
 */
export interface BaristaPreferences extends Record<string, unknown> {
  /** Start Barista when you log in */
  autoLaunch: boolean
  /** Caffeinate as soon as the app starts */
  caffeinateOnStartup: boolean
  /** Minutes to stay awake. `-1` means indefinitely. */
  caffeinateDurationMinutes: number
  /** Collapse menu bar items automatically after a delay */
  isAutoCollapse: boolean
  /** Seconds to wait before auto-collapsing */
  autoCollapseDelay: number
  /** Keep a Dock icon. Off by default — Barista lives in the menu bar. */
  showInDock: boolean
  /** Offer a second, permanently hidden menu bar section */
  alwaysHiddenEnabled: boolean
  /** Hide the separator marking the collapsible section */
  separatorHidden: boolean
  /** Shortcut that toggles the menu bar */
  globalHotkey: string
}

export const DEFAULT_PREFERENCES: BaristaPreferences = {
  autoLaunch: false,
  caffeinateOnStartup: false,
  caffeinateDurationMinutes: -1,
  isAutoCollapse: false,
  autoCollapseDelay: 10,
  showInDock: false,
  alwaysHiddenEnabled: false,
  separatorHidden: false,
  globalHotkey: 'Cmd+Shift+B',
}
