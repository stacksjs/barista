import { resolve } from 'node:path'
import { renderTemplate } from '@stacksjs/stx'

const scenes = {
  awake: { title: 'Keep your Mac', emphasis: 'awake.', description: 'Indefinitely, or only as long as you need.', alternative: 'The sandboxed Barista app with an indefinite awake session' },
  timed: { title: 'A timer.', emphasis: 'Then rest.', description: 'Choose five minutes to eight hours. Your normal sleep settings take over when the timer ends.', alternative: 'The sandboxed Barista app running a one-hour timer' },
  off: { title: 'One shortcut.', emphasis: 'From any app.', description: 'Press ⌘⇧C to start or stop keeping your Mac awake.', alternative: 'The sandboxed Barista app with keep-awake turned off' },
} as const

const icon = `data:image/png;base64,${Buffer.from(await Bun.file('src/assets/icon_512@2x.png').arrayBuffer()).toString('base64')}`
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
    const capture = `data:image/png;base64,${Buffer.from(await image.arrayBuffer()).toString('base64')}`
    const html = await renderTemplate(resolve('resources/app-store/screenshot.stx'), { context: { storeArtwork: { ...scenes[scene], icon, capture } } })
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
  },
})
console.log(`Store artwork preview: http://127.0.0.1:${server.port}/awake (1440 × 900)`)
