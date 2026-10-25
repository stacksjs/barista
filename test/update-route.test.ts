import { expect, it } from 'bun:test'

it('responds to update checks while the download remains pending', async () => {
  // Isolate mocks so the native app and other tests keep their real bindings.
  const script = `
    import { mock } from 'bun:test'
    let routes, finishDownload
    let status = { supported: true, checking: false, ready: false, installing: false, available: null }
    const pending = new Promise(resolve => { finishDownload = resolve })
    mock.module(${JSON.stringify(import.meta.resolve('../src/updates'))}, () => ({
      createUpdateChecker: async () => ({
        status: () => status,
        check: async () => {
          status = { ...status, checking: true, available: '0.0.8' }
          await pending
          status = { ...status, checking: false, ready: true }
          return status
        },
        start: () => {}, stop: () => {},
      }),
    }))
    mock.module('@stacksjs/stx/menubar', () => ({
      createMenuBarApp: options => {
        routes = options.routes
        return { preferences: { delete: () => {}, getAll: () => ({}) } }
      },
    }))
    const { createBaristaApp } = await import(${JSON.stringify(import.meta.resolve('../app'))})
    await createBaristaApp()
    const result = await Promise.race([
      Promise.resolve(routes['POST /api/updates/check']()),
      Bun.sleep(100).then(() => { throw Error('HTTP response waited for the download') }),
    ])
    if (!result.checking || result.ready) throw Error('pending progress was not returned')
    finishDownload()
    await Bun.sleep(0)
    const complete = routes['/api/updates']()
    if (complete.checking || !complete.ready || complete.available !== '0.0.8') throw Error('download completion was not available through polling')
  `
  const child = Bun.spawn([process.execPath, '--eval', script], { stdout: 'pipe', stderr: 'pipe' })
  const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()])
  expect(stderr).toBe('')
  expect(code).toBe(0)
})
