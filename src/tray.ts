/**
 * The menu bar item: its icon and its menu.
 *
 * Barista looks like the other caffeinate apps — a cup in the menu bar, no
 * label — so Craft renders our cup artwork as a native template image,
 * filled while awake and outlined while asleep. macOS then tints it correctly
 * in light mode, dark mode and when the menu bar is highlighted.
 *
 * Left click brews or stops the coffee; right click opens this menu, which is
 * rebuilt on every open so its labels and checkmarks reflect live state. It is
 * the app's only menu definition — the popup asks for it over `GET /api/tray`
 * rather than describing a second one.
 */
import type { MenuBarMenuItem } from '@stacksjs/stx/menubar'
import brewingIcon from './assets/tray-brewing.pdf' with { type: 'file' }
import idleIcon from './assets/tray-idle.pdf' with { type: 'file' }
import type { Duration } from './durations'
import { DURATIONS, QUICK_DURATIONS } from './durations'

/**
 * The cup Barista draws in the menu bar: a mug, no saucer, steaming while your
 * Mac is being kept awake.
 *
 * These are our own vector artwork rather than SF Symbols, because the system
 * set has no steaming mug — `cup.and.saucer` carries a saucer and `mug` has no
 * steam. Craft renders them as template images, so macOS still tints them for
 * light mode, dark mode and the highlighted menu bar.
 *
 * Bun embeds the artwork; Craft decodes the data directly into NSImage.
 * No extracted temporary files are needed by the installed application.
 */
export const TRAY_ICONS: { awake: string, asleep: string } = {
  awake: `data:application/pdf;base64,${Buffer.from(await Bun.file(brewingIcon).arrayBuffer()).toString('base64')}`,
  asleep: `data:application/pdf;base64,${Buffer.from(await Bun.file(idleIcon).arrayBuffer()).toString('base64')}`,
}

export interface TrayState {
  caffeinated: boolean
  /** Countdown to wake, e.g. "1:23:45". "∞" when running indefinitely. */
  remaining: string
  /** Minutes the current session runs for, or `-1` for indefinitely. */
  durationMinutes: number
}

export function trayIcon(caffeinated: boolean): string {
  return caffeinated ? TRAY_ICONS.awake : TRAY_ICONS.asleep
}

/** Hover text, the only place the remaining time is spelled out. */
export function trayTooltip(state: TrayState): string {
  if (!state.caffeinated)
    return 'Barista: your Mac can sleep'
  return state.durationMinutes > 0
    ? `Barista: awake for another ${state.remaining}`
    : 'Barista: awake indefinitely'
}

/** First line of the menu: what Barista is currently doing. Never clickable. */
export function trayStatusLabel(state: TrayState): string {
  if (!state.caffeinated)
    return 'Barista is off'
  return state.durationMinutes > 0
    ? `Awake for ${state.remaining}`
    : 'Awake indefinitely'
}

/** What a duration promises when nothing is running yet. */
function quickStartLabel(duration: Duration): string {
  return duration.minutes > 0
    ? `Keep awake for ${duration.label.toLowerCase()}`
    : 'Keep awake indefinitely'
}

export function buildTrayMenu(state: TrayState): MenuBarMenuItem[] {
  return [
    { label: trayStatusLabel(state), enabled: false },
    { type: 'separator' },

    ...(state.caffeinated
      ? [{ label: 'Turn Off', action: 'disableCaffeinate', shortcut: 'Cmd+Shift+C' } as MenuBarMenuItem]
      : []),

    // The common durations sit at the top level so starting a session is one
    // click, not a hover and a click. Everything else lives under "More".
    ...QUICK_DURATIONS.map(duration => ({
      label: state.caffeinated ? duration.label : quickStartLabel(duration),
      action: `duration:${duration.minutes}`,
      type: 'radio' as const,
      checked: state.caffeinated && state.durationMinutes === duration.minutes,
    })),
    {
      label: 'More durations',
      type: 'submenu',
      submenu: DURATIONS.filter(duration => !QUICK_DURATIONS.includes(duration)).map(duration => ({
        label: duration.label,
        action: `duration:${duration.minutes}`,
        type: 'radio' as const,
        checked: state.caffeinated && state.durationMinutes === duration.minutes,
      })),
    },

    { type: 'separator' },
    { label: 'Preferences...', action: 'preferences', shortcut: 'Cmd+,' },
    { label: 'About Barista', action: 'about' },
    { label: 'Check for Updates...', action: 'checkForUpdates' },

    { type: 'separator' },
    { label: 'Quit Barista', action: 'quit', shortcut: 'Cmd+Q' },
  ]
}
