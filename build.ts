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
import { createGitHubUpdateManifest, packageApp, resolveCraftExecutablePath, UPDATE_MANIFEST_ASSET } from '@stacksjs/stx/desktop'
import { existsSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import pkg from './package.json' with { type: 'json' }
import { REPOSITORY } from './src/updates'

const BUNDLE_ID = 'com.stacksjs.barista'
/** Apple Developer team that signs Barista. Not a secret — it appears in every identity name. */
const TEAM_ID = '3JJRNQW6B7'
const OUT_DIR = resolve(import.meta.dir, 'dist')

const signIdentity = process.env.APPLE_SIGNING_IDENTITY
const installerIdentity = process.env.APPLE_INSTALLER_SIGNING_IDENTITY
const provisioningProfile = process.env.APPLE_PROVISIONING_PROFILE_PATH

// An App Store package needs both certificates; without them this is a plain
// local build and the pkg target is skipped rather than failing late.
const appStore = Boolean(signIdentity && installerIdentity)

const binaryPath = join(OUT_DIR, 'barista')

// stx resolves Pantry's native provider, which can be embedded in the bundle.
const bundledCraft = resolveCraftExecutablePath(process.env.CRAFT_BINARY_PATH)

// Embedded tray artwork requires Craft's native image-data bridge.
const probe = Bun.spawnSync([bundledCraft, '--version'])
const version = `${probe.stdout}${probe.stderr}`.match(/craft version (\d+)\.(\d+)\.(\d+)/i)
if (probe.exitCode !== 0 || !version
  || (Number(version[1]) === 0 && Number(version[2]) === 0 && Number(version[3]) < 278))
throw new Error('Barista requires Craft 0.0.278 or newer. Run `pantry update` before building.')

console.log(`Compiling Barista ${pkg.version}...`)
const compiled = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'app.ts')],
  outdir: OUT_DIR,
  target: 'bun',
  // Most of the binary is Bun's own runtime, which is a fixed cost; minifying
  // still trims roughly a megabyte of app and dependency code.
  minify: true,
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
    // Ship the webview runtime inside the bundle so the installed app is
    // self-contained; the desktop runtime finds it beside its own executable.
    additionalExecutables: [bundledCraft],
    // Barista lives in the menu bar; a Dock icon would be noise.
    menuBarOnly: true,
    category: 'public.app-category.utilities',
    minimumSystemVersion: '15.0',
    // The App Store rejects a repeat upload of the same build number, and CI
    // run numbers increase monotonically.
    buildNumber: process.env.GITHUB_RUN_NUMBER,
    notarize: !appStore && Boolean(process.env.APPLE_NOTARIZE_APPLE_ID),
    appleId: process.env.APPLE_NOTARIZE_APPLE_ID,
    applePassword: process.env.APPLE_NOTARIZE_PASSWORD,
    teamId: process.env.APPLE_NOTARIZE_TEAM_ID || TEAM_ID,
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

// The manifest an installed Barista polls to find its next version. It records
// the DMG's SHA-256, so a download that doesn't match is refused rather than
// installed, and its URL points at this release's own tag.
const dmg = results.find(result => result.format === 'dmg')?.outputPath
if (dmg) {
  const manifestPath = join(OUT_DIR, UPDATE_MANIFEST_ASSET)
  const manifest = createGitHubUpdateManifest({
    repository: REPOSITORY,
    version: pkg.version,
    artifacts: { darwin: dmg },
  })

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`  ✓ update manifest: ${manifestPath}`)
}
