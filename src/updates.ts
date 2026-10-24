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
import { createSelfUpdater, relaunchBundle } from '@stacksjs/stx/desktop'
import { existsSync } from 'node:fs'
import process from 'node:process'

export const REPOSITORY = 'stacksjs/barista'

/** How often Barista looks for a new version while running. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

export interface UpdateStatus {
  /** False when running from source, where there is no bundle to replace. */
  supported: boolean
  checking: boolean
  ready: boolean
  installing: boolean
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

export async function createUpdateChecker(currentVersion: string, quit: () => void): Promise<UpdateChecker> {
  const appPath = bundlePath()

  let status: UpdateStatus = {
    supported: appPath !== null,
    checking: false,
    ready: false,
    installing: false,
    available: null,
  }

  if (!appPath) {
    return {
      status: () => status,
      check: async () => status,
      install: async () => { throw new Error('Updates apply to the installed app only') },
      start: () => {},
      stop: () => {},
    }
  }

  const updater = await createSelfUpdater({
    repository: REPOSITORY,
    currentVersion,
    appPath,
    // Downloading is cheap and makes "Install and Restart" instant, but the
    // swap itself stays a deliberate choice.
    autoDownload: true,
    autoInstall: false,
    relaunch: target => relaunchBundle({ appPath: target, quit, quitDelayMs: 250 }),
  })

  let downloadedVersion: string | null = null
  let pending: Promise<UpdateStatus> | undefined
  let timer: ReturnType<typeof setInterval> | undefined

  updater.on('update-available', (manifest: UpdateManifest) => {
    status = { ...status, available: manifest.version, ready: downloadedVersion === manifest.version, releaseNotes: manifest.releaseNotes }
  })
  updater.on('update-not-available', () => {
    status = { ...status, available: null, ready: false, releaseNotes: undefined }
  })
  updater.on('update-downloaded', (download: { version: string }) => {
    downloadedVersion = download.version
    status = { ...status, ready: download.version === status.available, error: undefined }
  })
  updater.on('error', (error: Error) => {
    downloadedVersion = null
    status = { ...status, ready: false, error: error.message }
  })

  const checker: UpdateChecker = {
    status: () => status,

    check() {
      if (pending) return pending
      if (status.installing) return Promise.resolve(status)
      downloadedVersion = null
      status = { ...status, checking: true, ready: false, error: undefined }
      pending = (async () => {
        try {
          await updater.checkForUpdates()
          status = { ...status, error: updater.getLastError()?.message }
        }
        catch (error) {
          status = { ...status, error: (error as Error).message }
        }
        finally {
          status = { ...status, checking: false }
          pending = undefined
        }
        return status
      })()
      return pending
    },

    async install() {
      if (!status.ready || status.checking || status.installing)
        throw new Error('Wait for an update to finish downloading before installing')
      status = { ...status, installing: true, error: undefined }
      try {
        await updater.installUpdate(true)
      }
      catch (error) {
        status = { ...status, installing: false, ready: false, error: (error as Error).message }
        downloadedVersion = null
        throw error
      }
    },

    start() {
      if (timer) return
      void checker.check()
      timer = setInterval(() => { void checker.check() }, CHECK_INTERVAL_MS)
      timer.unref()
    },
    stop() {
      clearInterval(timer)
      timer = undefined
    },
  }
  return checker
}
