import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const origin = new URL(process.env.SITE_URL || 'https://barista.stacksjs.com')
if (origin.protocol !== 'https:' || origin.pathname !== '/')
  throw new Error('SITE_URL must be an HTTPS origin without a path prefix.')
const root = resolve(process.env.SITE_ARTIFACT_DIR || 'storage/site')
const files = await Array.fromAsync(new Bun.Glob('**/*').scan({ cwd: root, onlyFiles: true }))
if (!files.includes('index.html')) throw new Error('Build the production site before verifying it.')

const digest = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')
// Reserved error templates are build artifacts, not successful public routes.
const publicFiles = files.filter(path => path !== '404.html' && !path.endsWith('/404.html'))
const publicPath = (path: string): string => `/${path}`.replace(/index\.html$/, '').replace(/\.html$/, '')
let verified = 0
for (let offset = 0; offset < publicFiles.length; offset += 4) {
  await Promise.all(publicFiles.slice(offset, offset + 4).map(async (path) => {
    const response = await fetch(new URL(publicPath(path), origin), { cache: 'no-store', signal: AbortSignal.timeout(30000) })
    if (response.status !== 200) throw new Error(`${path}: HTTP ${response.status}, expected 200`)
    const actual = new Uint8Array(await response.arrayBuffer())
    const expected = new Uint8Array(await Bun.file(resolve(root, path)).arrayBuffer())
    if (digest(actual) !== digest(expected)) throw new Error(`${path}: served bytes differ from the built artifact`)
    verified++
  }))
}

for (const path of ['/', '/docs/', '/docs/intro', '/docs/config', '/docs/caffeinate', '/docs/updates', '/docs/releasing', '/docs/site', '/docs/deployment']) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) })
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html'))
    throw new Error(`${path}: expected an HTML page, received HTTP ${response.status}`)
  const html = await response.text()
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]
  if (canonical && new URL(canonical).origin !== origin.origin)
    throw new Error(`${path}: canonical URL points outside production`)
  if (/<(?:script|img|link)\b[^>]*(?:src|href)="https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|")/.test(html))
    throw new Error(`${path}: asset or metadata points to a local preview`)
}

for (const path of ['/barista-verification-page-does-not-exist', '/docs/barista-verification-page-does-not-exist', '/404.html', '/docs/404.html']) {
  const missing = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) })
  if (missing.status !== 404) throw new Error(`${path}: HTTP ${missing.status}, expected 404`)
}
const http = await fetch(new URL('/', origin.origin.replace('https:', 'http:')), { redirect: 'manual' })
if (http.status < 300 || http.status >= 400 || !http.headers.get('location')?.startsWith(origin.origin))
  throw new Error('HTTP does not redirect to the HTTPS site')
const robots = await fetch(new URL('/robots.txt', origin)).then(response => response.text())
if (/Disallow:\s*\/(?:\s|$)/.test(robots)) throw new Error('Production robots.txt disallows the site')
console.log(`Live site verified: ${verified} artifact files match SHA-256, clean routes, HTTPS redirect, robots and HTTP 404.`)
