import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, realpathSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

if (process.platform !== 'darwin') throw new Error('Native E2E requires macOS')
const bundle = realpathSync(resolve(process.argv[2] || 'dist/Barista.app'))
const binary = join(bundle, 'Contents/MacOS/Barista')
const runtime = join(bundle, 'Contents/MacOS/craft')
const runtimeType = Bun.spawnSync(['/usr/bin/file', '-b', runtime])
assert.equal(runtimeType.exitCode, 0)
assert.match(runtimeType.stdout.toString(), /Mach-O/, 'packaged Craft must be a native executable, not an installation launcher')
const profile = mkdtempSync(join(tmpdir(), 'barista-e2e-'))
const preferencesPath = join(profile, 'preferences.json')
// An upgrade drops spacer settings while preserving awake and login choices.
const retiredPreferences = {
  isAutoCollapse: true,
  autoCollapseDelay: 5,
  separatorHidden: false,
  globalHotkey: 'Cmd+Shift+B',
  alwaysHiddenEnabled: true,
}
writeFileSync(preferencesPath, JSON.stringify({ ...retiredPreferences, caffeinateOnStartup: false, caffeinateDurationMinutes: -1, autoLaunch: false }))
const steps: string[] = []
let child: ReturnType<typeof Bun.spawn> | undefined
let nativePid: number | undefined
let output = ''
let url = ''

async function until<T>(read: () => T | Promise<T>, accepts: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    const value = await read()
    if (accepts(value)) return value
    if (child?.exitCode !== null) throw new Error(`Barista exited early: ${output}`)
    await Bun.sleep(100)
  }
  throw new Error(`Native E2E timed out: ${output}`)
}

async function start() {
  output = ''
  const env: Record<string, string | undefined> = {
    ...process.env,
    BARISTA_PREFERENCES_PATH: preferencesPath,
    PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  }
  delete env.CRAFT_BINARY_PATH
  delete env.CRAFT_BIN
  child = Bun.spawn([binary], {
    env,
    cwd: profile,
    stdin: 'ignore', stdout: 'pipe', stderr: 'pipe',
  })
  for (const stream of [child.stdout, child.stderr]) {
    if (stream && typeof stream !== 'number') {
      void (async () => {
        for await (const chunk of stream) output += new TextDecoder().decode(chunk)
      })()
    }
  }
  url = await until(() => output.match(/Barista [^\n]+ — (http:\/\/127\.0\.0\.1:\d+)/)?.[1] || '', Boolean)
  const ready = await until(status, state => state.nativeReady === true && state.shortcutRegistered === true)
  assert.equal(ready.menuBarController, 'nativeVisibility')
  const menuBar = ready.menuBar as Record<string, unknown>
  assert.equal(menuBar.backend, 'nativeVisibility', 'must never select the old spacer backend')
  assert.equal(typeof menuBar.available, 'boolean')
  assert.equal(typeof menuBar.authorized, 'boolean')
  assert.equal(ready.menuBarInitialized, menuBar.available)
  assert.equal(menuBar.markerWidth, menuBar.available ? 20 : 0, 'grouping must not reserve a wide spacer')
  assert.equal(menuBar.collapsed, false)
  assert.equal(menuBar.busy, false)
  const children = Bun.spawnSync(['/usr/bin/pgrep', '-P', String(child.pid)])
  const pids = children.stdout.toString().trim().split(/\s+/).filter(Boolean)
  assert(pids.length > 0, 'native runtime was not spawned')
  const processes = Bun.spawnSync(['/bin/ps', '-o', 'pid=,args=', '-p', pids.join(',')]).stdout.toString()
  const native = processes.split('\n').find(line => line.includes(join(bundle, 'Contents/MacOS/craft')))
  assert(native, 'packaged app must use its bundled native runtime')
  nativePid = Number.parseInt(native.trim(), 10)
  assert(native.includes('--headless'), 'preferences window must start hidden natively')
}

async function status() {
  return await fetch(`${url}/api/status`).then(response => response.json()) as Record<string, unknown>
}

async function post(path: string, data?: unknown, expected = 200) {
  const response = await fetch(`${url}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  assert.equal(response.status, expected, await response.clone().text())
  return response.json() as Promise<Record<string, unknown>>
}

function ownedAssertions() {
  const result = Bun.spawnSync(['/usr/bin/pmset', '-g', 'assertions'])
  assert.equal(result.exitCode, 0)
  return result.stdout.toString().split('\n').filter(line => line.includes(`pid ${child!.pid}(`))
}

async function waitForStop() {
  if (!child) return
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const code = await Promise.race([child.exited, new Promise<number>((_resolve, reject) => {
      timeout = setTimeout(() => reject(new Error('Barista did not quit')), 5000)
    })])
    assert.equal(code, 0)
    assert.equal(ownedAssertions().length, 0)
  }
  finally {
    clearTimeout(timeout)
  }
  child = undefined
  nativePid = undefined
}

async function stop() {
  child?.kill('SIGTERM')
  await waitForStop()
}

try {
  await start()
  assert.equal((await status()).active, false)
  assert.equal((await status()).autoLaunch, false)
  const saved = JSON.parse(readFileSync(preferencesPath, 'utf8'))
  for (const key of Object.keys(retiredPreferences))
    assert.equal(Object.hasOwn(saved, key), false, `${key} must be retired during upgrade`)
  steps.push('hidden native webview selects native visibility explicitly, reserves shortcuts and keeps the group control compact')

  const tray = await fetch(`${url}/api/tray`).then(response => response.json())
  const actions = tray.menu.map((item: { action?: string }) => item.action)
  assert.equal(actions.filter((action: string) => action === 'toggleMenuBar').length, 1)
  assert.equal(actions.includes('arrangeMenuBar'), true)
  assert.equal(actions.includes('toggleAutoCollapse'), false)
  steps.push('native tray exposes exactly one hide/reveal action and no legacy spacer controls')

  await post('/api/preferences', { menuBarGrouping: false })
  await until(status, state => state.menuBarInitialized === false && (state.menuBar as Record<string, unknown>).backend === 'legacy')
  const disabledMenu = await fetch(`${url}/api/tray`).then(response => response.json())
  assert.equal(disabledMenu.menu.some((item: { action?: string }) => item.action === 'toggleMenuBar'), false)
  await post('/api/preferences', { menuBarGrouping: true })
  const enabled = await until(status, state => (state.menuBar as Record<string, unknown>).backend === 'nativeVisibility')
  assert.equal((enabled.menuBar as Record<string, unknown>).markerWidth, (enabled.menuBar as Record<string, unknown>).available ? 20 : 0)
  steps.push('preference changes remove and recreate the actual native group control without a spacer')

  for (const minutes of [0, -2, 7, null, '60'])
    await post('/api/caffeinate/duration', { minutes }, 400)
  await post('/api/preferences', { isAutoCollapse: true }, 400)
  await post('/api/preferences', { autoCollapseDelay: 5 }, 400)
  await post('/api/preferences', { caffeinateOnStartup: 'yes' }, 400)
  assert.equal((await status()).active, false)
  steps.push('invalid durations and preferences leave sleep state unchanged')

  await post('/api/caffeinate/toggle')
  assert.equal((await status()).active, true)
  assert(ownedAssertions().some(line => line.includes('PreventUserIdleDisplaySleep')))
  assert(ownedAssertions().some(line => line.includes('PreventUserIdleSystemSleep')))
  steps.push('keep-awake owns real macOS display and idle assertions')

  const timed = await post('/api/caffeinate/duration', { minutes: 5 })
  assert.equal(timed.durationMinutes, 5)
  assert(typeof timed.endsAt === 'string')
  assert(Math.abs(Date.parse(timed.endsAt) - Date.now() - 300_000) < 2000)
  await post('/api/caffeinate/duration', { minutes: -1 })
  assert.equal((await status()).endsAt, null)
  assert.equal(ownedAssertions().filter(line => line.includes('Barista: keeping your Mac awake')).length, 3)
  steps.push('timed and indefinite sessions replace assertions without leaking')

  await post('/api/caffeinate/disable')
  assert.equal((await status()).active, false)
  assert.equal(ownedAssertions().length, 0)
  await post('/api/preferences', { caffeinateOnStartup: true })
  await stop()
  steps.push('Turn Off and process shutdown release every assertion')

  await start()
  const relaunched = await status()
  assert.equal(relaunched.active, true)
  assert.equal(relaunched.caffeinateDurationMinutes, -1)
  assert.equal(relaunched.menuBarInitialized, (relaunched.menuBar as Record<string, unknown>).available)
  assert(ownedAssertions().some(line => line.includes('PreventUserIdleSystemSleep')))
  steps.push('hidden relaunch preserves Start Awake and reopens with a compact, revealed group')

  assert(nativePid, 'native process was not recorded')
  process.kill(nativePid, 'SIGTERM')
  await waitForStop()
  steps.push('native process exit stops the host and releases its sleep assertions')

  unlinkSync(preferencesPath)
  await start()
  const fresh = await status()
  assert.equal(fresh.active, true)
  assert.equal(fresh.caffeinateDurationMinutes, -1)
  assert.equal(fresh.caffeinateOnStartup, true)
  assert.equal(fresh.autoLaunch, true)
  assert.equal(fresh.menuBarGrouping, true)
  await stop()
  steps.push('a fresh profile starts awake indefinitely with login and grouping enabled')

  console.log(steps.map(step => `✓ ${step}`).join('\n'))
}
finally {
  if (child) {
    child.kill('SIGTERM')
    await child.exited
  }
  rmSync(profile, { recursive: true, force: true })
}
