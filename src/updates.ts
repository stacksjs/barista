/**
 * Staying up to date.
 *
 * Barista updates itself from its own GitHub releases: each release carries an
 * `update.json` describing the new version and the SHA-256 of its disk image, so
 * an update that was tampered with in transit is refused rather than installed.
 *
 * Only a packaged `.app` can replace itself, so running from source reports
 * "not supported" instead of pretending to check.
 */
import type { UpdateManifest } from '@stacksjs/stx/desktop'
import { createGitHubUpdater } from '@stacksjs/stx/desktop'
import { existsSync } from 'node:fs'
import process from 'node:process'

export const REPOSITORY = 'stacksjs/barista'

/** How often Barista looks for a new version while running. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

export interface UpdateStatus {
  /** False when running from source, where there is no bundle to replace. */
  supported: boolean
  checking: boolean
  /** The newer version's number, once one has been found. */
  available: string | null
  releaseNotes?: string
  /** Set when the last check failed, so the UI can say why. */
  error?: string
}

/**
 * The `.app` bundle enclosing this executable, or null when running from source.
 *
 * A packaged Barista lives at `Barista.app/Contents/MacOS/Barista`, so the
 * bundle is three levels up from the binary.
 */
export function bundlePath(execPath: string = process.execPath): string | null {
  const marker = '.app/Contents/MacOS/'
  const index = execPath.indexOf(marker)
  if (index === -1)
    return null

  const bundle = execPath.slice(0, index + '.app'.length)
  return existsSync(bundle) ? bundle : null
}

export interface UpdateChecker {
  status: () => UpdateStatus
  /** Look for a newer release now. Resolves once the check settles. */
  check: () => Promise<UpdateStatus>
  /** Replace the bundle with the downloaded update and relaunch. */
  install: () => Promise<void>
  /** Begin checking periodically in the background. */
  start: () => void
  stop: () => void
}

export function createUpdateChecker(currentVersion: string): UpdateChecker {
  const appPath = bundlePath()

  let status: UpdateStatus = {
    supported: appPath !== null,
    checking: false,
    available: null,
  }

  if (!appPath) {
    return {
      status: () => status,
      check: async () => status,
      install: async () => {},
      start: () => {},
      stop: () => {},
    }
  }

  const updater = createGitHubUpdater({
    repository: REPOSITORY,
    currentVersion,
    appPath,
    // Downloading is cheap and makes "Install and Restart" instant, but the
    // swap itself stays a deliberate choice.
    autoDownload: true,
    autoInstall: false,
    checkInterval: CHECK_INTERVAL_MS,
  })

  updater.on('update-available', (manifest: UpdateManifest) => {
    status = { ...status, available: manifest.version, releaseNotes: manifest.releaseNotes }
  })
  updater.on('update-not-available', () => {
    status = { ...status, available: null }
  })
  updater.on('error', (error: Error) => {
    status = { ...status, error: error.message }
  })

  return {
    status: () => status,

    async check() {
      status = { ...status, checking: true, error: undefined }
      try {
        const manifest = await updater.checkForUpdates()
        status = {
          ...status,
          checking: false,
          available: manifest ? manifest.version : null,
          releaseNotes: manifest?.releaseNotes,
        }
      }
      catch (error) {
        status = { ...status, checking: false, error: (error as Error).message }
      }
      return status
    },

    install: () => updater.installUpdate(true),

    start: () => updater.startAutoCheck(),
    stop: () => updater.stopAutoCheck(),
  }
}
