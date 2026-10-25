import { storeArtworkHtml, storeScenes as scenes } from './store-artwork'

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 4174,
  async fetch(request) {
    const scene = new URL(request.url).pathname.slice(1) as keyof typeof scenes
    if (!Object.hasOwn(scenes, scene)) return new Response('Choose /awake, /timed or /off', { status: 404 })
    const pkg = await Bun.file('package.json').json() as { version: string }
    const manifest = await Bun.file('resources/app-store/captures/manifest.json').json() as { version: string }
    if (manifest.version !== pkg.version) return new Response('Recapture the current Store version before exporting its artwork.', { status: 503 })
    const image = Bun.file(`resources/app-store/captures/${scene}.png`)
    if (!await image.exists()) return new Response('Capture this scene from the packaged Store edition first.', { status: 503 })
    const html = await storeArtworkHtml(scene, `resources/app-store/captures/${scene}.png`)
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
  },
})
console.log(`Store artwork preview: http://127.0.0.1:${server.port}/awake (1440 × 900)`)
