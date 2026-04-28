/**
 * Barista — Stay caffeinated & craft pretty menu bars.
 *
 * A lightweight macOS menubar utility built with stx + Craft.
 * Runs as a native menubar app with a popup window for quick access.
 */
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createApp } from '@stacksjs/ts-craft'
import { setAutoLaunch } from '@stacksjs/desktop'
import { startServer } from './src/server'
import { prefs } from './src/preferences'
import { enableCaffeinate } from './src/caffeinate'

// Resolve the native Craft binary (Zig-compiled)
const craftPath = join(homedir(), 'Code/Tools/craft/packages/zig/zig-out/bin/craft')

// Start the local server (random available port)
const server = startServer({ port: 0 })
const port = server.port

// Enable caffeinate on startup if configured
if (prefs.get('caffeinateOnStartup')) {
  enableCaffeinate()
  console.log('Caffeinate enabled on startup')
}

// Sync auto-launch state
const autoLaunchEnabled = prefs.get('autoLaunch')
setAutoLaunch(autoLaunchEnabled, {
  appName: 'Barista',
  isHidden: true,
}).catch(() => {})

// Watch for auto-launch preference changes
prefs.onChange('autoLaunch', (enabled) => {
  setAutoLaunch(enabled as boolean, {
    appName: 'Barista',
    isHidden: true,
  }).catch(() => {})
})

// Create the native Craft app
const app = createApp({
  craftPath,
  url: `http://127.0.0.1:${port}`,
  window: {
    title: '☕️',
    width: 320,
    height: 740,
    systemTray: true,
    hideDockIcon: !prefs.get('showInDock'),
    titlebarHidden: true,
    resizable: false,
    alwaysOnTop: true,
    darkMode: true,
  },
})

console.log('Starting Barista...')
console.log(`  Server: http://127.0.0.1:${port}`)
console.log(`  Caffeinate on startup: ${prefs.get('caffeinateOnStartup')}`)

// Launch the native window
await app.show()
