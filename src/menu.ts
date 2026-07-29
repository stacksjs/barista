/**
 * The tray menu.
 *
 * Rebuilt on every open so checkmarks and labels reflect the live state, and
 * it is the app's only menu definition — the popup asks for it over
 * `GET /api/menu` rather than describing its own.
 */
import type { MenuBarMenuItem } from '@stacksjs/stx/menubar'
import { DURATIONS } from './durations'

export interface MenuState {
  caffeinated: boolean
  menuBarCollapsed: boolean
  isAutoCollapse: boolean
  alwaysHiddenEnabled: boolean
  durationMinutes: number
}

export function buildTrayMenu(state: MenuState): MenuBarMenuItem[] {
  return [
    {
      label: state.caffeinated ? 'Disable Caffeinate' : 'Enable Caffeinate',
      action: 'toggleCaffeinate',
      shortcut: 'Cmd+Shift+C',
    },
    {
      label: 'Duration',
      type: 'submenu',
      submenu: DURATIONS.map(duration => ({
        label: duration.label,
        action: `duration:${duration.minutes}`,
        type: 'radio' as const,
        checked: state.durationMinutes === duration.minutes,
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
    { type: 'separator' },
    { label: 'Quit Barista', action: 'quit', shortcut: 'Cmd+Q' },
  ]
}
