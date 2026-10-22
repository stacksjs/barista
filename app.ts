/**
 * Barista — keep your Mac awake, one click from the menu bar.
 *
 * The whole app is a template, a few endpoints and a tray menu; `createMenuBarApp`
 * turns those into a native window.
 */
import type { MenuBarApp } from '@stacksjs/stx/menubar'
import type { BaristaPreferences } from './src/preferences'
import { resolve } from 'node:path'
import { createMenuBarApp } from '@stacksjs/stx/menubar'
import pkg from './package.json' with { type: 'json' }
// Embedded at build time so the compiled binary carries the popup with it —
// a shipped .app has no src/barista.stx on disk to read.
import templateSource from './src/barista.stx' with { type: 'text' }
import { caffeinateSnapshot, disableCaffeinate, enableCaffeinate, toggleCaffeinate } from './src/caffeinate'
import { COLLAPSE_DELAYS, DURATIONS, isKnownDuration } from './src/durations'
import { DEFAULT_PREFERENCES } from './src/preferences'
import { buildTrayMenu, trayIcon, trayTooltip } from './src/tray'
import { createUpdateChecker } from './src/updates'

export function createBaristaApp(): MenuBarApp<BaristaPreferences> {
  let menuBarCollapsed = false
  let menuBarInitialized = false
  let shortcutRegistered = false
  const updates = createUpdateChecker(pkg.version)

  /** The shape both the popup and the tray read from. */
  function baristaState(prefs: { getAll: () => BaristaPreferences }) {
    const caffeinate = caffeinateSnapshot()

    return {
      ...prefs.getAll(),
      ...caffeinate,
      // The tray shows a cup, and spells the time out on hover.
      menuBarCollapsed,
      menuBarInitialized,
      shortcutRegistered,
    }
  }

  const app = createMenuBarApp<BaristaPreferences>({
    name: 'Barista',
    template: resolve(import.meta.dir, 'src/barista.stx'),
    templateSource,
    preferences: DEFAULT_PREFERENCES,
    preferencesPath: process.env.BARISTA_PREFERENCES_PATH,
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
        durationMinutes: caffeinate.durationMinutes ?? prefs.get('caffeinateDurationMinutes'),
        menuBarCollapsed,
        isAutoCollapse: prefs.get('isAutoCollapse'),
      })
    },

    onStop: () => {
      disableCaffeinate()
      updates.stop()
    },

    routes: {
      'POST /api/preferences': async (request, prefs) => {
        const patch: Record<string, unknown> | null = await request.json().catch(() => null)
        if (!patch || typeof patch !== 'object' || Array.isArray(patch))
          return Response.json({ error: 'Expected preferences' }, { status: 400 })
        for (const [key, value] of Object.entries(patch)) {
          if (!Object.hasOwn(DEFAULT_PREFERENCES, key)
            || typeof value !== typeof DEFAULT_PREFERENCES[key]
            || (key === 'caffeinateDurationMinutes' && !isKnownDuration(value as number))
            || (key === 'autoCollapseDelay' && !COLLAPSE_DELAYS.includes(value as number))
            || (key === 'globalHotkey' && value !== DEFAULT_PREFERENCES.globalHotkey))
          return Response.json({ error: `Invalid preference: ${key}` }, { status: 400 })
        }
        for (const [key, value] of Object.entries(patch)) prefs.set(key, value)
        return prefs.getAll()
      },
      '/api/status': (_request, prefs) => baristaState(prefs),

      /** Icon, tooltip and menu in one call — everything the tray needs to redraw. */
      '/api/tray': (_request, prefs) => {
        const caffeinate = caffeinateSnapshot()
        const state = {
          caffeinated: caffeinate.active,
          remaining: caffeinate.remainingFormatted,
          durationMinutes: caffeinate.durationMinutes ?? prefs.get('caffeinateDurationMinutes'),
          menuBarCollapsed,
          isAutoCollapse: prefs.get('isAutoCollapse'),
        }

        return {
          // Craft decodes the embedded artwork as a native template image.
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
        const body = await request.json().catch(() => null)
        const minutes = body?.minutes
        if (typeof minutes !== 'number' || !isKnownDuration(minutes))
          return Response.json({ error: 'Choose one of the offered durations' }, { status: 400 })
        enableCaffeinate(minutes)
        prefs.set('caffeinateDurationMinutes', minutes)
        return baristaState(prefs)
      },

      'POST /api/caffeinate/disable': () => {
        disableCaffeinate()
        return caffeinateSnapshot()
      },

      'POST /api/menu-bar/state': async (request) => {
        const body = await request.json().catch(() => null)
        const collapsed = body?.collapsed
        if (typeof collapsed !== 'boolean')
          return Response.json({ error: 'collapsed must be a boolean' }, { status: 400 })
        menuBarCollapsed = collapsed
        menuBarInitialized = true
        if (typeof body.shortcutRegistered === 'boolean') shortcutRegistered = body.shortcutRegistered
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

  updates.start()
  return app
}

if (import.meta.main) {
  const app = createBaristaApp()
  if (app.preferences.get('caffeinateOnStartup'))
    enableCaffeinate(app.preferences.get('caffeinateDurationMinutes'))

  const shutdown = () => { app.stop(); process.exit(0) }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
  await app.start()
  console.log(`Barista ${pkg.version} — ${app.url}`)
}
