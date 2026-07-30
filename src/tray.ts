/**
 * The menu bar item: its icon and its menu.
 *
 * Barista looks like the other caffeinate apps — a cup in the menu bar, no
 * label — so the icon is an SF Symbol that Craft renders as a template image,
 * filled while awake and outlined while asleep. macOS then tints it correctly
 * in light mode, dark mode and when the menu bar is highlighted.
 *
 * Left click brews or stops the coffee; right click opens this menu, which is
 * rebuilt on every open so its labels and checkmarks reflect live state. It is
 * the app's only menu definition — the popup asks for it over `GET /api/tray`
 * rather than describing a second one.
 */
import type { MenuBarMenuItem } from '@stacksjs/stx/menubar'
import { DURATIONS } from './durations'

/**
 * SF Symbols, which Craft renders as template images at menu bar metrics — so
 * macOS tints them for light mode, dark mode and the highlighted menu bar, at
 * the same size as the system's own glyphs.
 */
export const TRAY_ICONS = {
  awake: 'cup.and.saucer.fill',
  asleep: 'cup.and.saucer',
} as const

/**
 * Text fallback for a Craft binary older than the setIcon fix, where an icon
 * would draw nothing and the item would be invisible. The two differ by Unicode
 * presentation selector: colour emoji while awake, flat glyph while asleep.
 */
export const TRAY_GLYPHS = {
  awake: '☕️',
  asleep: '☕︎',
} as const

/**
 * First Craft release whose `setIcon` actually draws: earlier binaries left the
 * status item button on `NSNoImage`, passed the JSON payload through as the
 * symbol name, and never sized the glyph.
 */
export const TRAY_ICON_MIN_CRAFT = '0.0.52'

/** First Craft release that tells left and right tray clicks apart. */
export const TRAY_CLICK_MIN_CRAFT = '0.0.53'

/**
 * Whether this Craft binary can draw a tray icon.
 *
 * A version Craft reports as `0.0.0` is a local development build, which is
 * built from source and therefore has the fix.
 */
export function supportsTrayIcon(craftVersion: string | null): boolean {
  if (!craftVersion)
    return false
  if (craftVersion === '0.0.0')
    return true

  const parse = (version: string) => version.split('.').map(part => Number.parseInt(part, 10) || 0)
  const [major, minor, patch] = parse(craftVersion)
  const [minMajor, minMinor, minPatch] = parse(TRAY_ICON_MIN_CRAFT)

  if (major !== minMajor) return major > minMajor
  if (minor !== minMinor) return minor > minMinor
  return patch >= minPatch
}

/** Pull the version out of `craft --version` output. */
export function parseCraftVersion(output: string): string | null {
  return output.match(/craft version (\d+\.\d+\.\d+)/i)?.[1] ?? null
}

export interface TrayState {
  caffeinated: boolean
  /** Countdown to wake, e.g. "1:23:45". "∞" when running indefinitely. */
  remaining: string
  /** Minutes the current session runs for, or `-1` for indefinitely. */
  durationMinutes: number
  menuBarCollapsed: boolean
  isAutoCollapse: boolean
  alwaysHiddenEnabled: boolean
}

export function trayIcon(caffeinated: boolean): string {
  return caffeinated ? TRAY_ICONS.awake : TRAY_ICONS.asleep
}

export function trayGlyph(caffeinated: boolean): string {
  return caffeinated ? TRAY_GLYPHS.awake : TRAY_GLYPHS.asleep
}

/** Hover text — the only place the remaining time is spelled out. */
export function trayTooltip(state: TrayState): string {
  if (!state.caffeinated)
    return 'Barista — your Mac can sleep'
  return state.durationMinutes > 0
    ? `Barista — awake for another ${state.remaining}`
    : 'Barista — awake indefinitely'
}

/** First line of the menu: what Barista is currently doing. Never clickable. */
export function trayStatusLabel(state: TrayState): string {
  if (!state.caffeinated)
    return 'Barista is off'
  return state.durationMinutes > 0
    ? `Awake — ${state.remaining} left`
    : 'Awake indefinitely'
}

export function buildTrayMenu(state: TrayState): MenuBarMenuItem[] {
  return [
    { label: trayStatusLabel(state), enabled: false },
    { type: 'separator' },

    ...(state.caffeinated
      ? [{ label: 'Turn Off', action: 'disableCaffeinate', shortcut: 'Cmd+Shift+C' } as MenuBarMenuItem]
      : []),
    {
      label: state.caffeinated ? 'Change to' : 'Activate for',
      type: 'submenu',
      submenu: DURATIONS.map(duration => ({
        label: duration.label,
        action: `duration:${duration.minutes}`,
        type: 'radio' as const,
        checked: state.caffeinated && state.durationMinutes === duration.minutes,
      })),
    },

    { type: 'separator' },
    {
      label: state.menuBarCollapsed ? 'Show Menu Bar Items' : 'Hide Menu Bar Items',
      action: 'toggleMenuBar',
      shortcut: 'Cmd+Shift+B',
    },
    {
      label: 'Auto Collapse',
      action: 'toggleAutoCollapse',
      type: 'checkbox',
      checked: state.isAutoCollapse,
    },
    {
      label: 'Always-Hidden Section',
      action: 'toggleAlwaysHidden',
      type: 'checkbox',
      checked: state.alwaysHiddenEnabled,
    },

    { type: 'separator' },
    { label: 'Preferences...', action: 'preferences', shortcut: 'Cmd+,' },
    { label: 'About Barista', action: 'about' },
    { label: 'Check for Updates...', action: 'checkForUpdates' },

    { type: 'separator' },
    { label: 'Quit Barista', action: 'quit', shortcut: 'Cmd+Q' },
  ]
}
