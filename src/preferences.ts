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
  /** Keep a Dock icon. Off by default — Barista lives in the menu bar. */
  showInDock: boolean
}

export const DEFAULT_PREFERENCES: BaristaPreferences = {
  autoLaunch: false,
  caffeinateOnStartup: false,
  caffeinateDurationMinutes: -1,
  showInDock: false,
}
