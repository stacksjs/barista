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
// Embedded at build time so the compiled binary carries the popup with it —
// a shipped .app has no src/barista.stx on disk to read.
import templateSource from './src/barista.stx' with { type: 'text' }
import { caffeinateSnapshot, disableCaffeinate, enableCaffeinate, isCaffeinated, toggleCaffeinate } from './src/caffeinate'
import { COLLAPSE_DELAYS, DURATIONS } from './src/durations'
import { DEFAULT_PREFERENCES } from './src/preferences'
import { buildTrayMenu, trayGlyph, trayIcon, trayTooltip } from './src/tray'
import { createUpdateChecker } from './src/updates'

/**
 * Whether the menu bar is currently collapsed. Only the webview knows — it owns
 * the Craft menu bar bridge — so it reports back here for the tray menu's label.
 */
let menuBarCollapsed = false

const updates = createUpdateChecker(pkg.version)

/** The shape both the popup and the tray read from. */
function baristaState(prefs: { getAll: () => BaristaPreferences }) {
  const caffeinate = caffeinateSnapshot()

  return {
    ...prefs.getAll(),
    ...caffeinate,
    // The tray shows a cup, and spells the time out on hover.
    trayGlyph: trayGlyph(caffeinate.active),
    menuBarCollapsed,
  }
}

const app = createMenuBarApp<BaristaPreferences>({
  name: 'Barista',
  template: resolve(import.meta.dir, 'src/barista.stx'),
  templateSource,
  preferences: DEFAULT_PREFERENCES,
  launchAtLogin: 'autoLaunch',

  window: {
    width: 320,
    height: 740,
    hideDockIcon: !DEFAULT_PREFERENCES.showInDock,
  },

  context: (prefs) => {
    // Exactly what GET /api/status returns, so the popup's signals and its
    // first paint agree by construction.
    const state = baristaState(prefs)

    return {
      ...state,
      durations: DURATIONS,
      collapseDelays: COLLAPSE_DELAYS,
      version: pkg.version,
      // The popup seeds its signals from this rather than waiting a round trip
      // and painting a stale panel first.
      initialState: JSON.stringify(state),
    }
  },

  menu: (prefs) => {
    const caffeinate = caffeinateSnapshot()

    return buildTrayMenu({
      caffeinated: caffeinate.active,
      remaining: caffeinate.remainingFormatted,
      durationMinutes: prefs.get('caffeinateDurationMinutes'),
      menuBarCollapsed,
      isAutoCollapse: prefs.get('isAutoCollapse'),
      alwaysHiddenEnabled: prefs.get('alwaysHiddenEnabled'),
    })
  },

  routes: {
    '/api/status': (_request, prefs) => baristaState(prefs),

    /** Icon, tooltip and menu in one call — everything the tray needs to redraw. */
    '/api/tray': (_request, prefs) => {
      const caffeinate = caffeinateSnapshot()
      const state = {
        caffeinated: caffeinate.active,
        remaining: caffeinate.remainingFormatted,
        durationMinutes: prefs.get('caffeinateDurationMinutes'),
        menuBarCollapsed,
        isAutoCollapse: prefs.get('isAutoCollapse'),
        alwaysHiddenEnabled: prefs.get('alwaysHiddenEnabled'),
      }

      return {
        glyph: trayGlyph(state.caffeinated),
        icon: trayIcon(state.caffeinated),
        tooltip: trayTooltip(state),
        menu: buildTrayMenu(state),
      }
    },

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

    '/api/updates': () => updates.status(),
    'POST /api/updates/check': () => updates.check(),
    'POST /api/updates/install': async () => {
      await updates.install()
      return { installing: true }
    },
  },
})

if (app.preferences.get('caffeinateOnStartup'))
  enableCaffeinate(app.preferences.get('caffeinateDurationMinutes'))

// Look for a new release in the background. No-ops when running from source,
// where there is no bundle to replace.
updates.start()

await app.start()

console.log(`Barista ${pkg.version} — ${app.url}`)
