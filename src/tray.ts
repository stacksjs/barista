/**
 * The menu bar item: its icon and its menu.
 *
 * Barista looks like the other caffeinate apps — a cup in the menu bar, no
 * label — so the icon is an SF Symbol that Craft renders as a template image,
 * filled while awake and outlined while asleep. macOS then tints it correctly
 * in light mode, dark mode and when the menu bar is highlighted.
 *
 * The menu is rebuilt on every open so its labels and checkmarks reflect live
 * state, and this is the app's only menu definition — the popup asks for it over
 * `GET /api/menu` rather than describing a second one.
 */
import type { MenuBarMenuItem } from '@stacksjs/stx/menubar'
import { DURATIONS } from './durations'

/**
 * SF Symbols, rendered as template images so macOS tints them.
 *
 * Not in use yet: `craft.tray.setIcon` draws nothing on the currently published
 * Craft binary, because the status item button's `imagePosition` is left at
 * `NSNoImage`. Fixed in Craft (`bridge_tray.zig`); once a binary carrying that
 * fix ships, the tray can set these instead of a title glyph.
 */
export const TRAY_ICONS = {
  awake: 'cup.and.saucer.fill',
  asleep: 'cup.and.saucer',
} as const

/**
 * The cup Barista shows in the menu bar. No app name beside it — the glyph is
 * the whole item, the way the other caffeinate apps do it.
 *
 * The two differ by Unicode presentation selector rather than by shape: U+FE0F
 * asks for the colour emoji while awake, U+FE0E for the flat monochrome glyph
 * while asleep. Same cup, clearly different state, and both are just text — so
 * this works on any Craft binary.
 */
export const TRAY_GLYPHS = {
  awake: '☕️',
  asleep: '☕︎',
} as const

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
