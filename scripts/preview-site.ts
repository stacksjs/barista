import { resolve, sep } from 'node:path'

const root = resolve('storage/site')
if (!await Bun.file(resolve(root, 'index.html')).exists())
  throw new Error('Run bun run build:site before previewing the site.')

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT || 4173),
  async fetch(request) {
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    let pathname: string
    try { pathname = decodeURIComponent(new URL(request.url).pathname) }
    catch { return new Response('Bad request', { status: 400 }) }
    const path = resolve(root, `.${pathname}`)
    if (path !== root && !path.startsWith(root + sep))
      return new Response('Forbidden', { status: 403 })
    for (const candidate of [path, `${path}.html`, resolve(path, 'index.html')]) {
      const file = Bun.file(candidate)
      if (await file.exists() && (await file.stat()).isFile())
        return new Response(request.method === 'HEAD' ? null : file, { headers: { 'Content-Type': file.type } })
    }
    return new Response(request.method === 'HEAD' ? null : Bun.file(resolve(root, '404.html')), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  },
})
console.log(`Barista site preview: ${server.url}`)
