/**
 * Build a distributable Barista.
 *
 * Compiles the app to a single binary, then hands it to Craft's packaging,
 * which produces the `.app`, a `.dmg` for direct download, and — when signing
 * identities are present — a `.pkg` for the Mac App Store.
 *
 * Signing is driven entirely by environment variables so the same command works
 * locally (unsigned) and on CI (signed by pantry's `apple-signing` step):
 *
 *   APPLE_SIGNING_IDENTITY            application certificate
 *   APPLE_INSTALLER_SIGNING_IDENTITY  installer certificate, required for the App Store
 *   APPLE_PROVISIONING_PROFILE_PATH   .provisionprofile embedded in the bundle
 *   APPLE_NOTARIZE_*                  Apple ID, app-specific password and team ID
 */
import { packageApp } from 'craft-native'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import pkg from './package.json' with { type: 'json' }

const BUNDLE_ID = 'org.stacksjs.barista'
const OUT_DIR = resolve(import.meta.dir, 'dist')

const signIdentity = process.env.APPLE_SIGNING_IDENTITY
const installerIdentity = process.env.APPLE_INSTALLER_SIGNING_IDENTITY
const provisioningProfile = process.env.APPLE_PROVISIONING_PROFILE_PATH

// An App Store package needs both certificates; without them this is a plain
// local build and the pkg target is skipped rather than failing late.
const appStore = Boolean(signIdentity && installerIdentity)

const binaryPath = join(OUT_DIR, 'barista')

console.log(`Compiling Barista ${pkg.version}...`)
const compiled = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'app.ts')],
  outdir: OUT_DIR,
  target: 'bun',
  compile: { outfile: binaryPath },
})

if (!compiled.success) {
  console.error(compiled.logs.join('\n'))
  process.exit(1)
}

const entitlements = resolve(import.meta.dir, 'barista.entitlements')
const icon = resolve(import.meta.dir, 'src/assets/icon.icns')

console.log(appStore ? 'Packaging for the Mac App Store...' : 'Packaging (unsigned local build)...')
const results = await packageApp({
  name: 'Barista',
  version: pkg.version,
  description: pkg.description,
  author: pkg.author,
  homepage: pkg.homepage,
  binaryPath,
  bundleId: BUNDLE_ID,
  outDir: OUT_DIR,
  platforms: ['macos'],
  iconPath: existsSync(icon) ? icon : undefined,
  macos: {
    dmg: true,
    appStore,
    signIdentity,
    installerIdentity,
    provisioningProfile,
    entitlements: existsSync(entitlements) ? entitlements : undefined,
    // Barista lives in the menu bar; a Dock icon would be noise.
    menuBarOnly: true,
    category: 'public.app-category.utilities',
    minimumSystemVersion: '13.0',
    // The App Store rejects a repeat upload of the same build number, and CI
    // run numbers increase monotonically.
    buildNumber: process.env.GITHUB_RUN_NUMBER,
    notarize: !appStore && Boolean(process.env.APPLE_NOTARIZE_APPLE_ID),
    appleId: process.env.APPLE_NOTARIZE_APPLE_ID,
    applePassword: process.env.APPLE_NOTARIZE_PASSWORD,
    teamId: process.env.APPLE_NOTARIZE_TEAM_ID,
  },
})

for (const result of results) {
  if (result.success)
    console.log(`  ✓ ${result.format}: ${result.outputPath}`)
  else
    console.error(`  ✗ ${result.format}: ${result.error}`)
}

if (results.some(result => !result.success))
  process.exit(1)
