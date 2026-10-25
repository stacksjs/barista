/** Exercise the public stx/Craft updater against the exact GitHub release assets. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { AutoUpdater, extractBundle, readBundleIdentity, verifyBundleTrust } from '@stacksjs/stx/desktop'
import { compareReleases, releaseVersion } from './release-version'

if (process.platform !== 'darwin') throw new Error('Updater verification requires macOS')
if (Bun.spawnSync(['pgrep', '-x', 'Barista']).exitCode === 0)
  throw new Error('Run updater verification on an idle Mac runner without an existing Barista process')

const tag = process.argv[2]
releaseVersion(tag || '')
const repository = 'stacksjs/barista'
const teamId = '3JJRNQW6B7'
const profile = mkdtempSync(join(tmpdir(), 'barista-updater-e2e-'))
const bundle = join(profile, 'Barista.app')
const preferences = join(profile, 'preferences.json')
const evidence = resolve(process.env.BARISTA_RELEASE_EVIDENCE || 'storage/release-verification')
let child: ReturnType<typeof Bun.spawn> | undefined
let output = ''
let url = ''
let nativePids: string[] = []
const steps: string[] = []

function command(args: string[]) {
  const result = Bun.spawnSync(args)
  assert.equal(result.exitCode, 0, `${args[0]}: ${result.stderr}`)
  return result.stdout.toString().trim()
}

async function until<T>(read: () => Promise<T>, accepts: (value: T) => boolean, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const value = await read()
    if (accepts(value)) return value
    if (child && child.exitCode !== null) throw new Error(`Barista exited: ${output}`)
    await Bun.sleep(200)
  }
  throw new Error(`Updater E2E timed out: ${output}`)
}

async function status(): Promise<Record<string, unknown>> {
  try { return await (await fetch(`${url}/api/status`)).json() as Record<string, unknown> }
  catch { return {} }
}

async function start(version: string) {
  output = ''
  child = Bun.spawn([join(bundle, 'Contents/MacOS/Barista')], {
    cwd: profile,
    env: { ...process.env, BARISTA_PREFERENCES_PATH: preferences, PATH: '/usr/bin:/bin:/usr/sbin:/sbin', CRAFT_BIN: undefined, CRAFT_BINARY_PATH: undefined },
    stdout: 'pipe', stderr: 'pipe',
  })
  for (const stream of [child.stdout, child.stderr]) {
    if (stream && typeof stream !== 'number') {
      void (async () => { for await (const chunk of stream) output += new TextDecoder().decode(chunk) })()
    }
  }
  url = await until(async () => output.match(/Barista ([^\s]+) — (http:\/\/127\.0\.0\.1:\d+)/)?.[2] || '', Boolean)
  assert(output.includes(`Barista ${version} —`))
  const ready = await until(status, state => state.nativeReady === true && state.shortcutRegistered === true)
  assert.equal(ready.active, true)
  assert.equal(ready.autoLaunch, false)
  assert.equal(ready.caffeinateDurationMinutes, -1)
  nativePids = command(['pgrep', '-P', String(child.pid)]).split(/\s+/)
  assert(nativePids.length > 0, 'A real bundled native runtime must be running')
  const assertions = command(['pmset', '-g', 'assertions'])
  assert(assertions.split('\n').some(line => line.includes(`pid ${child!.pid}(`) && line.includes('PreventUserIdleSystemSleep')))
}

async function stop() {
  if (!child) return
  const current = child
  current.kill('SIGTERM')
  await Promise.race([current.exited, Bun.sleep(10_000).then(() => { throw new Error('Previous Barista host did not stop') })])
  child = undefined
  for (const pid of nativePids) {
    await until(async () => Bun.spawnSync(['kill', '-0', pid]).exitCode !== 0, Boolean, 10_000)
  }
  nativePids = []
}

try {
  const releases = JSON.parse(command(['gh', 'api', `repos/${repository}/releases?per_page=100`])) as Array<{ tag_name: string, draft: boolean, prerelease: boolean }>
  const previous = releases.filter(release => !release.draft && !release.prerelease && /^v\d+\.\d+\.\d+$/.test(release.tag_name) && compareReleases(release.tag_name, tag) < 0)
    .sort((a, b) => compareReleases(b.tag_name, a.tag_name))[0]
  assert(previous, 'A previous stable release is required for upgrade qualification')
  const oldDir = join(profile, 'previous')
  const targetDir = join(profile, 'target')
  mkdirSync(oldDir)
  mkdirSync(targetDir)
  for (const [release, directory] of [[previous.tag_name, oldDir], [tag, targetDir]])
    command(['gh', 'release', 'download', release, '--repo', repository, '--pattern', 'update.json', '--dir', directory])
  const oldManifest = JSON.parse(readFileSync(join(oldDir, 'update.json'), 'utf8'))
  const target = JSON.parse(readFileSync(join(targetDir, 'update.json'), 'utf8'))
  assert.equal(target.version, tag.slice(1))
  assert.equal(oldManifest.version, previous.tag_name.slice(1))
  for (const [manifest, release] of [[oldManifest, previous.tag_name], [target, tag]]) {
    const artifact = manifest.platforms.darwin
    assert.equal(artifact.url, `https://github.com/${repository}/releases/download/${release}/Barista-${manifest.version}.dmg`)
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/)
  }
  const archive = join(oldDir, `Barista-${oldManifest.version}.dmg`)
  command(['gh', 'release', 'download', previous.tag_name, '--repo', repository, '--pattern', `Barista-${oldManifest.version}.dmg`, '--dir', oldDir])
  assert.equal(createHash('sha256').update(readFileSync(archive)).digest('hex'), oldManifest.platforms.darwin.sha256)
  const staged = await extractBundle(archive)
  try { command(['ditto', staged.appPath, bundle]) }
  finally { rmSync(staged.stagingDir, { recursive: true, force: true }) }
  const originalTrust = await verifyBundleTrust(bundle, { teamId, requireNotarized: true })
  assert(originalTrust.ok, JSON.stringify(originalTrust))
  writeFileSync(preferences, JSON.stringify({ autoLaunch: false, caffeinateOnStartup: true, caffeinateDurationMinutes: -1, menuBarGrouping: false }))
  await start(oldManifest.version)
  const previousPid = child!.pid
  steps.push('previous signed release starts with isolated preferences, native runtime and real keep-awake assertions')
  const updater = new AutoUpdater({
    updateUrl: `https://github.com/${repository}/releases/download/${tag}/update.json`,
    currentVersion: oldManifest.version, appPath: bundle,
    autoDownload: true, autoInstall: false,
    downloadDir: join(profile, 'downloads'),
    macos: { teamId, requireNotarized: true },
    relaunch: async () => { await stop(); await start(target.version) },
  })
  const errors: string[] = []
  let downloaded = false
  updater.on('error', (error: Error) => { errors.push(error.message) })
  updater.on('update-downloaded', () => { downloaded = true })
  const found = await updater.checkForUpdates()
  assert.equal(found?.version, target.version, errors.join('\n'))
  assert(downloaded, errors.join('\n') || 'Updater did not verify the release download')
  await updater.installUpdate(true)
  assert.notEqual(child!.pid, previousPid)
  assert.deepEqual(errors, [])
  const trust = await verifyBundleTrust(bundle, { teamId, requireNotarized: true })
  assert(trust.ok, JSON.stringify(trust))
  assert.equal((await readBundleIdentity(bundle)).identifier, 'com.stacksjs.barista')
  assert.equal(command(['plutil', '-extract', 'CFBundleShortVersionString', 'raw', join(bundle, 'Contents/Info.plist')]), target.version)
  assert.equal(JSON.parse(readFileSync(preferences, 'utf8')).autoLaunch, false)
  steps.push('public stx/Craft updater downloads the published candidate, checks SHA-256 and Apple trust, swaps bundles and restarts both native processes')
  steps.push('replacement starts on its first attempt and retains indefinite awake and isolated preferences')
  mkdirSync(evidence, { recursive: true })
  writeFileSync(join(evidence, 'updater.json'), `${JSON.stringify({ from: oldManifest.version, to: target.version, sha256: target.platforms.darwin.sha256, signingTeam: teamId, steps, verifiedAt: new Date().toISOString() }, null, 2)}\n`)
  console.log(steps.join('\n'))
}
finally {
  await stop()
  rmSync(profile, { recursive: true, force: true })
}
