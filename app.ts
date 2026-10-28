/**
 * Barista — keep your Mac awake, one click from the menu bar.
 *
 * The whole app is a template, a few endpoints and a tray menu; `createMenuBarApp`
 * turns those into a native window.
 */
import type { MenuBarApp } from '@stacksjs/stx/menubar'
import type { MenuBarState } from './src/menu-bar'
import type { BaristaPreferences } from './src/preferences'
import { resolve } from 'node:path'
import { createMenuBarApp } from '@stacksjs/stx/menubar'
import pkg from './package.json' with { type: 'json' }
// Embedded at build time so the compiled binary carries the popup with it —
// a shipped .app has no src/barista.stx on disk to read.
import templateSource from './src/barista.stx' with { type: 'text' }
import { caffeinateSnapshot, disableCaffeinate, enableCaffeinate, toggleCaffeinate } from './src/caffeinate'
import { DURATIONS, isKnownDuration } from './src/durations'
import { DEFAULT_PREFERENCES } from './src/preferences'
import { buildTrayMenu, trayIcon, trayTooltip } from './src/tray'

export async function createBaristaApp(): Promise<MenuBarApp<BaristaPreferences>> {
  const appStore = process.env.BARISTA_DISTRIBUTION === 'app-store'
  let nativeReady = false
  let menuBar: MenuBarState = { initialized: false, collapsed: false }
  let shortcutRegistered = false
  // The Store binary omits the external updater when compiled for that channel.
  const updates = process.env.BARISTA_DISTRIBUTION === 'app-store' ? null
    : await (await import('./src/updates')).createUpdateChecker(pkg.version, () => { app.stop(); process.exit(0) })

  /** The shape both the popup and the tray read from. */
  function baristaState(prefs: { getAll: () => BaristaPreferences }) {
    const caffeinate = caffeinateSnapshot()

    return {
      ...prefs.getAll(),
      ...caffeinate,
      // The tray shows a cup, and spells the time out on hover.
      nativeReady,
      appStore,
      menuBarController: appStore ? 'none' : 'legacy',
      menuBarInitialized: menuBar.initialized,
      menuBar,
      shortcutRegistered,
    }
  }

  const app = createMenuBarApp<BaristaPreferences>({
    name: 'Barista',
    template: resolve(import.meta.dir, 'src/barista.stx'),
    templateSource,
    host: appStore ? 'craft' : 'application',
    preferences: appStore ? { ...DEFAULT_PREFERENCES, autoLaunch: false, menuBarGrouping: false } : DEFAULT_PREFERENCES,
    preferencesPath: process.env.BARISTA_PREFERENCES_PATH,
    // An isolated E2E profile must never remove or replace the real login item.
    launchAtLogin: appStore || process.env.BARISTA_PREFERENCES_PATH ? undefined : 'autoLaunch',

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
        menuBarGrouping: prefs.get('menuBarGrouping'),
        updatesSupported: !appStore,
        menuBar,
      })
    },

    onStop: () => {
      disableCaffeinate()
      updates?.stop()
    },

    routes: {
      'POST /api/preferences': async (request, prefs) => {
        const patch: Record<string, unknown> | null = await request.json().catch(() => null)
        if (!patch || typeof patch !== 'object' || Array.isArray(patch))
          return Response.json({ error: 'Expected preferences' }, { status: 400 })
        for (const [key, value] of Object.entries(patch)) {
          if (!Object.hasOwn(DEFAULT_PREFERENCES, key)
            || typeof value !== typeof DEFAULT_PREFERENCES[key]
            || (key === 'caffeinateDurationMinutes' && !isKnownDuration(value as number)))
          return Response.json({ error: `Invalid preference: ${key}` }, { status: 400 })
          if (appStore && key === 'menuBarGrouping' && value === true)
            return Response.json({ error: 'Icon grouping is available in the GitHub edition' }, { status: 400 })
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
          menuBarGrouping: prefs.get('menuBarGrouping'),
          updatesSupported: !appStore,
          menuBar,
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

      'POST /api/native/state': async (request) => {
        const body = await request.json().catch(() => null)
        if (typeof body?.menuBar?.initialized !== 'boolean' || typeof body?.menuBar?.collapsed !== 'boolean'
          || typeof body?.shortcutRegistered !== 'boolean')
          return Response.json({ error: 'Expected native menu bar and shortcut state' }, { status: 400 })
        menuBar = body.menuBar
        shortcutRegistered = body.shortcutRegistered
        nativeReady = true
        return { nativeReady, menuBar, menuBarInitialized: menuBar.initialized, shortcutRegistered }
      },

      '/api/updates': () => updates?.status() ?? { supported: false, channel: 'app-store' },
      'POST /api/updates/check': () => {
        if (!updates) return Response.json({ error: 'Updates are managed by the Mac App Store' }, { status: 405 })
        // Downloads outlive a WebKit HTTP request. The popup polls progress.
        void updates.check()
        return updates.status()
      },
      'POST /api/updates/install': async () => {
        try {
          if (!updates) return Response.json({ error: 'Updates are managed by the Mac App Store' }, { status: 405 })
          await updates.install()
          return { installing: true }
        }
        catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 409 })
        }
      },
    },
  })

  // Grouping is manual; retire the old separator and auto-collapse preferences.
  for (const key of ['isAutoCollapse', 'autoCollapseDelay', 'separatorHidden', 'globalHotkey', 'alwaysHiddenEnabled'])
    app.preferences.delete(key)

  if (appStore) app.preferences.set('menuBarGrouping', false)
  updates?.start()
  return app
}

if (import.meta.main) {
  const app = await createBaristaApp()
  if (app.preferences.get('caffeinateOnStartup'))
    enableCaffeinate(app.preferences.get('caffeinateDurationMinutes'))

  const shutdown = () => { app.stop(); process.exit(0) }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
  await app.start()
  console.log(`Barista ${pkg.version} — ${app.url}`)
}
