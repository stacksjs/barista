import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { captureScreenshot, renderTemplate } from '@stacksjs/stx'

export const storeScenes = {
  awake: { title: 'Keep your Mac', emphasis: 'awake.', description: 'Indefinitely, or only as long as you need.', alternative: 'The sandboxed Barista app with an indefinite awake session' },
  timed: { title: 'A timer.', emphasis: 'Then rest.', description: 'Choose five minutes to eight hours. Your normal sleep settings take over when the timer ends.', alternative: 'The sandboxed Barista app running a one-hour timer' },
  off: { title: 'One shortcut.', emphasis: 'From any app.', description: 'Press ⌘⇧C to start or stop keeping your Mac awake.', alternative: 'The sandboxed Barista app with keep-awake turned off' },
} as const

export async function storeArtworkHtml(scene: keyof typeof storeScenes, capturePath: string): Promise<string> {
  const icon = `data:image/png;base64,${readFileSync('src/assets/icon_512@2x.png').toString('base64')}`
  const capture = `data:image/png;base64,${readFileSync(capturePath).toString('base64')}`
  return await renderTemplate(resolve('resources/app-store/screenshot.stx'), { context: { storeArtwork: { ...storeScenes[scene], icon, capture } } })
}

/** Build Store marketing compositions from the packaged app's current native-test captures. */
export async function generateStoreArtwork(directory: string): Promise<void> {
  const destination = join(directory, 'screenshots')
  mkdirSync(destination, { recursive: true })
  for (const scene of Object.keys(storeScenes) as Array<keyof typeof storeScenes>) {
    const html = join(directory, `${scene}.html`)
    writeFileSync(html, await storeArtworkHtml(scene, join(directory, 'captures', `${scene}.png`)))
    const image = join(destination, `${scene}.png`)
    await captureScreenshot(html, image, { width: 1440, height: 900, waitSelector: '.app' })
    const png = readFileSync(image)
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert([[1440, 900], [2880, 1800]].some(([width, height]) => png.readUInt32BE(16) === width && png.readUInt32BE(20) === height), 'Store artwork must have an Apple-supported aspect ratio and size')
  }
}
