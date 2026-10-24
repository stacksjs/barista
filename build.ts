/**
 * Build a distributable Barista.
 *
 * Compiles the app to a single binary, then hands it to Craft's packaging,
 * which produces a self-contained `.app` and a `.dmg` for direct download.
 * The private native icon-hiding backend requires direct distribution.
 *
 * Signing is driven entirely by environment variables so the same command works
 * locally (unsigned) and on CI (signed by pantry's `apple-signing` step):
 *
 *   APPLE_SIGNING_IDENTITY            application certificate
 *   APPLE_NOTARY_API_KEY_*            App Store Connect API key path, ID and issuer
 */
import { createGitHubUpdateManifest, packageApp, resolveCraftExecutablePath, UPDATE_MANIFEST_ASSET } from '@stacksjs/stx/desktop'
import { menuBarTemplatePlugin } from '@stacksjs/stx/menubar-build'
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
// Reject the former App Store path explicitly: this runtime uses a private API.
if (process.env.APPLE_INSTALLER_SIGNING_IDENTITY)
  throw new Error('Barista icon hiding requires direct distribution. Use a Developer ID Application identity without an installer identity.')

if (process.env.APPLE_NOTARY_API_KEY_PATH
  && (!signIdentity || !process.env.APPLE_NOTARY_API_KEY_ID || !process.env.APPLE_NOTARY_API_ISSUER))
  throw new Error('Notarization requires a signing identity, API key ID and issuer.')

const binaryPath = join(OUT_DIR, 'barista')

// stx resolves Pantry's native provider, which can be embedded in the bundle.
const bundledCraft = resolveCraftExecutablePath(process.env.CRAFT_BINARY_PATH)

// Craft 0.0.328 supplies display-scoped grouping and app notarization tickets.
const probe = Bun.spawnSync([bundledCraft, '--version'])
const version = `${probe.stdout}${probe.stderr}`.match(/craft version (\d+)\.(\d+)\.(\d+)/i)
if (probe.exitCode !== 0 || !version
  || (Number(version[1]) === 0 && Number(version[2]) === 0 && Number(version[3]) < 328))
  throw new Error('Barista requires Craft 0.0.328 or newer. Run `pantry install` before building.')

console.log(`Compiling Barista ${pkg.version}...`)
const compiled = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'app.ts')],
  outdir: OUT_DIR,
  target: 'bun',
  plugins: [await menuBarTemplatePlugin({ templates: [resolve(import.meta.dir, 'src/barista.stx')] })],
  // Most of the binary is Bun's own runtime, which is a fixed cost; minifying
  // still trims roughly a megabyte of app and dependency code.
  minify: true,
  compile: { outfile: binaryPath },
})

if (!compiled.success) {
  console.error(compiled.logs.join('\n'))
  process.exit(1)
}

const entitlements = resolve(import.meta.dir, 'barista.direct.entitlements')
const icon = resolve(import.meta.dir, 'src/assets/icon.icns')

console.log(signIdentity ? 'Packaging signed direct build...' : 'Packaging unsigned local build...')
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
    appStore: false,
    signIdentity,
    entitlements: existsSync(entitlements) ? entitlements : undefined,
    // Craft embeds an identified native agent; stx launches it from the bundle.
    nativeRuntimePath: bundledCraft,
    // Barista lives in the menu bar; a Dock icon would be noise.
    menuBarOnly: true,
    category: 'public.app-category.utilities',
    minimumSystemVersion: '15.0',
    // CI run numbers give every distributable a distinct build number.
    buildNumber: process.env.GITHUB_RUN_NUMBER,
    notarize: Boolean(process.env.APPLE_NOTARY_API_KEY_PATH),
    notaryApiKey: process.env.APPLE_NOTARY_API_KEY_PATH ? {
      path: process.env.APPLE_NOTARY_API_KEY_PATH,
      keyId: process.env.APPLE_NOTARY_API_KEY_ID!,
      issuer: process.env.APPLE_NOTARY_API_ISSUER!,
    } : undefined,
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
