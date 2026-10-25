import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

if (process.platform !== 'darwin') throw new Error('Native Store E2E requires macOS')
const source = realpathSync(resolve(process.argv[2] || 'dist/app-store/Barista.app'))
const sourceBackend = join(source, 'Contents/MacOS/craft-backend')
const sourceNative = join(source, 'Contents/MacOS/Barista')
for (const binary of [sourceBackend, sourceNative]) {
  const type = Bun.spawnSync(['file', '-b', binary])
  assert.match(type.stdout.toString(), /Mach-O/, 'both native host and TypeScript backend must be packaged executables')
}
const nativeBytes = readFileSync(sourceNative)
for (const forbidden of ['MenuBarClientCore', 'MBAssessmentMode', 'developerExtrasEnabled', 'javaScriptCanAccessClipboard', 'drawsBackground'])
  assert(!nativeBytes.includes(Buffer.from(forbidden)), 'the Store runtime must exclude known private platform API markers')
const signature = Bun.spawnSync(['codesign', '--verify', '--deep', '--strict', source])
assert.equal(signature.exitCode, 0, signature.stderr.toString())

// A Mac App Store distribution signature requires Apple's distribution path.
// Test a separately identified copy under a real App Sandbox, as development
// code. The signed submission package is retained unchanged for Apple validation.
const profile = mkdtempSync(join(tmpdir(), 'barista-store-e2e-'))
const bundle = join(profile, 'Barista.app')
const identifier = `org.stacksjs.barista.store.e2e.p${process.pid}.t${Date.now()}`
cpSync(source, bundle, { recursive: true })
rmSync(join(bundle, 'Contents/embedded.provisionprofile'))
const patched = Bun.spawnSync(['plutil', '-replace', 'CFBundleIdentifier', '-string', identifier, join(bundle, 'Contents/Info.plist')])
assert.equal(patched.exitCode, 0)
const sandbox = join(profile, 'sandbox.plist')
const inherit = join(profile, 'inherit.plist')
writeFileSync(sandbox, '<?xml version="1.0"?><plist version="1.0"><dict><key>com.apple.security.app-sandbox</key><true/><key>com.apple.security.network.client</key><true/><key>com.apple.security.network.server</key><true/></dict></plist>')
writeFileSync(inherit, '<?xml version="1.0"?><plist version="1.0"><dict><key>com.apple.security.app-sandbox</key><true/><key>com.apple.security.inherit</key><true/></dict></plist>')
for (const [target, entitlements] of [[join(bundle, 'Contents/MacOS/craft-backend'), inherit], [bundle, sandbox]]) {
  const result = Bun.spawnSync(['codesign', '--force', '--sign', '-', '--entitlements', entitlements, target])
  assert.equal(result.exitCode, 0, result.stderr.toString())
}
let child: ReturnType<typeof Bun.spawn> | undefined
let output = ''
let url = ''
let cookie = ''
let backendPid: number | undefined

function diagnostics(): string {
  return output.replace(/session=[\w-]+/g, 'session=REDACTED').slice(-4000)
}
async function until<T>(read: () => T | Promise<T>, accepts: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    const value = await read()
    if (accepts(value)) return value
    if (child && child.exitCode !== null) throw new Error(`Native Store host exited: ${diagnostics()}`)
    await Bun.sleep(100)
  }
  throw new Error(`Native Store E2E timed out: ${diagnostics()}`)
}
async function status(): Promise<Record<string, unknown>> {
  return await fetch(new URL('/api/status', url), { headers: { cookie } }).then(response => response.json())
}
async function post(path: string, data?: unknown, expected = 200): Promise<Record<string, unknown>> {
  const response = await fetch(new URL(path, url), {
    method: 'POST', headers: { cookie, 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  assert.equal(response.status, expected, await response.clone().text())
  return response.json()
}
function assertions(): string[] {
  const result = Bun.spawnSync(['pmset', '-g', 'assertions'])
  return result.stdout.toString().split('\n').filter(line => line.includes(`pid ${backendPid}(`))
}
async function start(): Promise<void> {
  output = ''
  // The unique bundle identity gives this copy its own App Sandbox container.
  // Exercise the production preference path rather than a test-only override.
  const environment: NodeJS.ProcessEnv = { ...process.env, PATH: '/usr/bin:/bin:/usr/sbin:/sbin' }
  delete environment.BARISTA_PREFERENCES_PATH
  child = Bun.spawn([join(bundle, 'Contents/MacOS/Barista')], {
    env: environment,
    stdin: 'ignore', stdout: 'pipe', stderr: 'pipe',
  })
  for (const stream of [child.stdout, child.stderr]) {
    if (!stream || typeof stream === 'number') continue
    void (async () => {
      for await (const chunk of stream) output += new TextDecoder().decode(chunk)
    })()
  }
  url = await until(() => output.match(/Barista [^\n]+ — (http:\/\/127\.0\.0\.1:\d+\S*)/)?.[1] || '', Boolean)
  const initial = await fetch(url)
  assert.equal(initial.status, 200)
  cookie = initial.headers.get('set-cookie')!.split(';')[0]
  const html = await initial.text()
  assert(!html.includes('<div class="group-title">Menu bar</div>'))
  assert(html.includes('Updates are managed by the Mac App Store'))
  const ready = await until(status, state => state.nativeReady === true && state.shortcutRegistered === true)
  assert.equal(ready.appStore, true)
  assert.equal(ready.menuBarController, 'none')
  assert.equal(ready.menuBarInitialized, false)
  assert.equal(ready.menuBarGrouping, false)
  await Bun.sleep(1200)
  assert.equal((await status()).shortcutRegistered, true)
  const children = Bun.spawnSync(['pgrep', '-P', String(child.pid)])
  const pids = children.stdout.toString().trim().split(/\s+/).filter(Boolean)
  assert.equal(pids.length, 1, 'the native host must own exactly one inherited backend')
  backendPid = Number(pids[0])
  const commandLine = Bun.spawnSync(['ps', '-o', 'args=', '-p', String(backendPid)])
  assert(commandLine.stdout.toString().includes(join(bundle, 'Contents/MacOS/craft-backend')))
}
async function stop(): Promise<void> {
  child!.kill('SIGTERM')
  await child!.exited
  child = undefined
  await until(assertions, value => value.length === 0)
}

async function verifySandboxEnforcement(): Promise<void> {
  // Exercise the same signed host/backend sandbox relationship with a tiny
  // isolated backend. The submission app and its backend remain unchanged.
  const probePath = join(homedir(), `.barista-sandbox-probe-${process.pid}-${Date.now()}`)
  try {
    writeFileSync(probePath, 'owned sandbox probe', { mode: 0o600 })
    const fixture = join(profile, 'sandbox-probe.ts')
    writeFileSync(fixture, `
      let denied = false, errorCode = ''
      try { await Bun.write(process.env.BARISTA_SANDBOX_PROBE_PATH!, 'unexpected write') }
      catch (error) { denied = true; errorCode = error.code }
      const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response('Sandbox verification') })
      console.log('http://127.0.0.1:' + server.port + '/?session=' + crypto.randomUUID())
      console.log('BARISTA_SANDBOX_PROBE ' + JSON.stringify({ denied, errorCode }))
      process.stdin.resume()
      process.stdin.once('end', () => server.stop())
    `)
    const build = await Bun.build({ entrypoints: [fixture], target: 'bun', compile: { outfile: join(bundle, 'Contents/MacOS/craft-backend') } })
    assert(build.success, 'could not compile the sandbox enforcement fixture')
    for (const [target, entitlements] of [[join(bundle, 'Contents/MacOS/craft-backend'), inherit], [bundle, sandbox]]) {
      const signed = Bun.spawnSync(['codesign', '--force', '--sign', '-', '--entitlements', entitlements, target])
      assert.equal(signed.exitCode, 0, signed.stderr.toString())
    }
    output = ''
    child = Bun.spawn([join(bundle, 'Contents/MacOS/Barista')], {
      env: { ...process.env, BARISTA_SANDBOX_PROBE_PATH: probePath, PATH: '/usr/bin:/bin:/usr/sbin:/sbin' },
      stdin: 'ignore', stdout: 'pipe', stderr: 'pipe',
    })
    for (const stream of [child.stdout, child.stderr]) {
      if (!stream || typeof stream === 'number') continue
      void (async () => {
        for await (const chunk of stream) output += new TextDecoder().decode(chunk)
      })()
    }
    const proof = await until(() => output.match(/BARISTA_SANDBOX_PROBE (\{[^\n]+\})/)?.[1] || '', Boolean)
    const result = JSON.parse(proof) as { denied: boolean, errorCode: string }
    assert.equal(result.denied, true, 'App Sandbox must deny an unrelated home-directory write')
    assert(['EPERM', 'EACCES'].includes(result.errorCode))
    assert.equal(readFileSync(probePath, 'utf8'), 'owned sandbox probe')
    await stop()
  }
  finally { rmSync(probePath, { force: true }) }
}

try {
  await start()
  const initial = await status()
  assert.equal(initial.active, true)
  assert.equal(initial.durationMinutes, -1)
  assert.equal(initial.autoLaunch, false, 'Store login startup requires the user to opt in')
  assert(assertions().some(line => line.includes('PreventUserIdleDisplaySleep')))
  assert(assertions().some(line => line.includes('PreventUserIdleSystemSleep')))
  assert.equal((await fetch(new URL('/api/status', url))).status, 401)
  assert.equal((await fetch(new URL('/api/status', url), { headers: { cookie, origin: 'https://example.com' } })).status, 403)
  await post('/api/updates/check', undefined, 405)
  await post('/api/updates/install', undefined, 405)
  await post('/api/preferences', { menuBarGrouping: true }, 400)
  const tray = await fetch(new URL('/api/tray', url), { headers: { cookie } }).then(response => response.json()) as { menu: { action?: string }[] }
  assert(!tray.menu.some(item => ['checkForUpdates', 'toggleMenuBar', 'arrangeMenuBar'].includes(item.action || '')))
  await post('/api/caffeinate/disable')
  assert.equal((await status()).active, false)
  assert.equal(assertions().length, 0)
  const timed = await post('/api/caffeinate/duration', { minutes: 60 })
  assert.equal(timed.durationMinutes, 60)
  assert(Math.abs(Date.parse(timed.endsAt as string) - Date.now() - 3_600_000) < 2000)
  assert.equal((await post('/api/caffeinate/duration', { minutes: -1 })).endsAt, null)
  assert.equal(assertions().filter(line => line.includes('Barista: keeping your Mac awake')).length, 3)
  await post('/api/caffeinate/duration', { minutes: 60 })
  await post('/api/preferences', { caffeinateOnStartup: false })
  await stop()
  await start()
  const relaunched = await status()
  assert.equal(relaunched.active, false)
  assert.equal(relaunched.caffeinateDurationMinutes, 60)
  assert.equal(relaunched.caffeinateOnStartup, false)
  assert.equal(relaunched.autoLaunch, false)
  await post('/api/preferences', { caffeinateOnStartup: true })
  await post('/api/caffeinate/duration', { minutes: -1 })
  await stop()
  await start()
  assert.equal((await status()).active, true)
  assert.equal((await status()).durationMinutes, -1)
  await stop()
  await verifySandboxEnforcement()
  console.log('✓ Store runtime excludes known private API markers and uses a sandboxed native host')
  console.log('✓ authenticated native bridge, shortcut ownership, sessions and timers work')
  console.log('✓ grouping and external update controls are absent and their endpoints reject use')
  console.log('✓ login remains opt-in, preferences survive relaunch and power assertions are released')
  console.log('✓ App Sandbox denies an unrelated home-directory write from the inherited backend')
}
finally {
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await child.exited }
  rmSync(profile, { recursive: true, force: true })
}
