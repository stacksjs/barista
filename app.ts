/**
 * Barista — keep your Mac awake, one click from the menu bar.
 *
 * The whole app is a template, a few endpoints and a tray menu; `createMenuBarApp`
 * turns those into a native window.
 */
import type { BaristaPreferences } from './src/preferences'
import { resolve } from 'node:path'
import { createMenuBarApp } from '@stacksjs/stx/menubar'
import pkg from './package.json' with { type: 'json' }
import { caffeinateSnapshot, disableCaffeinate, enableCaffeinate, isCaffeinated, toggleCaffeinate } from './src/caffeinate'
import { COLLAPSE_DELAYS, DURATIONS } from './src/durations'
import { buildTrayMenu } from './src/menu'
import { DEFAULT_PREFERENCES } from './src/preferences'

/**
 * Whether the menu bar is currently collapsed. Only the webview knows — it owns
 * the Craft menu bar bridge — so it reports back here for the tray menu's label.
 */
let menuBarCollapsed = false

const app = createMenuBarApp<BaristaPreferences>({
  name: 'Barista',
  template: resolve(import.meta.dir, 'src/barista.stx'),
  preferences: DEFAULT_PREFERENCES,
  launchAtLogin: 'autoLaunch',

  window: {
    width: 320,
    height: 740,
    hideDockIcon: !DEFAULT_PREFERENCES.showInDock,
  },

  context: prefs => ({
    ...prefs.getAll(),
    ...caffeinateSnapshot(),
    durations: DURATIONS,
    collapseDelays: COLLAPSE_DELAYS,
    version: pkg.version,
    // The popup seeds its signals from this rather than waiting a round trip
    // and painting a stale panel first.
    initialState: JSON.stringify({ ...prefs.getAll(), ...caffeinateSnapshot() }),
  }),

  menu: prefs => buildTrayMenu({
    caffeinated: isCaffeinated(),
    menuBarCollapsed,
    isAutoCollapse: prefs.get('isAutoCollapse'),
    alwaysHiddenEnabled: prefs.get('alwaysHiddenEnabled'),
    durationMinutes: prefs.get('caffeinateDurationMinutes'),
  }),

  routes: {
    '/api/status': (_request, prefs) => ({
      ...prefs.getAll(),
      ...caffeinateSnapshot(),
    }),

    'POST /api/caffeinate/toggle': (_request, prefs) => {
      toggleCaffeinate(prefs.get('caffeinateDurationMinutes'))
      return caffeinateSnapshot()
    },

    // Picking a duration also starts a session — choosing "4 hours" while
    // asleep is a request to stay awake for four hours, not a bare preference.
    'POST /api/caffeinate/duration': async (request, prefs) => {
      const { minutes } = await request.json() as { minutes: number }
      prefs.set('caffeinateDurationMinutes', minutes)
      enableCaffeinate(minutes)
      return caffeinateSnapshot()
    },

    'POST /api/caffeinate/disable': () => {
      disableCaffeinate()
      return caffeinateSnapshot()
    },

    'POST /api/menu-bar/state': async (request) => {
      const { collapsed } = await request.json() as { collapsed: boolean }
      menuBarCollapsed = collapsed
      return { collapsed: menuBarCollapsed }
    },
  },
})

if (app.preferences.get('caffeinateOnStartup'))
  enableCaffeinate(app.preferences.get('caffeinateDurationMinutes'))

await app.start()

console.log(`Barista ${pkg.version} — ${app.url}`)
