/** Encode the README demo from screenshots of the verified native app. */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

interface Scene {
  image: string
  title: string
  subtitle: string
  detail: string
}
interface Demo {
  scenes: Scene[]
  /** Crop after scaling the native screenshot to 350px wide. */
  panelHeight: number
}
const root = resolve(import.meta.dir, '..')
const manifest = resolve(process.argv[2] || join(root, '.github/art/demo/scenes.json'))
const output = resolve(process.argv[3] || join(root, '.github/art/barista.gif'))
const demo = JSON.parse(await readFile(manifest, 'utf8')) as Demo
const ffmpeg = Bun.which('ffmpeg')
if (!ffmpeg) throw new Error('Install FFmpeg through Pantry before generating the demo')
const font = '/System/Library/Fonts/Helvetica.ttc'
const dir = await mkdtemp(join(tmpdir(), 'barista-demo-'))
const seconds = 3.5
const filterPath = (value: string): string => value.replace(/[\\:,'[\];]/g, '\\$&')

function run(args: string[]): void {
  const result = Bun.spawnSync([ffmpeg!, '-hide_banner', '-loglevel', 'error', '-y', ...args], { stdout: 'pipe', stderr: 'pipe' })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
}

try {
  const clips: string[] = []
  for (const [index, scene] of demo.scenes.entries()) {
    const fields = [scene.title, scene.subtitle, scene.detail, `0${index + 1} / 0${demo.scenes.length}`]
    const textFiles: string[] = []
    for (const [field, text] of fields.entries()) {
      const file = join(dir, `${index}-${field}.txt`)
      await writeFile(file, text)
      textFiles.push(filterPath(file))
    }
    const text = (field: number, size: number, y: number, color: string): string =>
      `drawtext=fontfile='${filterPath(font)}':textfile='${textFiles[field]}':fontsize=${size}:fontcolor=${color}:x=58:y=${y}:line_spacing=12`
    const clip = join(dir, `${index}.mkv`)
    const filters = [
      // Mask the captured desktop outside the native window's top corners.
      `[0:v]scale=350:-1:flags=lanczos,crop=iw:min(ih\\,${demo.panelHeight}):0:0,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(Y,18)*lt(X,18),if(lte(hypot(X-18,Y-18),18),255,0),if(lt(Y,18)*gt(X,W-19),if(lte(hypot(X-W+19,Y-18),18),255,0),255))'[panel]`,
      `[1:v]scale=42:42[icon]`,
      `[2:v][icon]overlay=58:44[brand]`,
      `[brand][panel]overlay=600:40:shortest=1,drawbox=x=600:y=40:w=350:h=${demo.panelHeight}:color=0x453f4a:t=1,drawtext=fontfile='${filterPath(font)}':text='Barista':fontsize=22:fontcolor=0xf2f0ee:x=112:y=52,${text(0, 50, 174, '0xf2f0ee')},${text(1, 22, 330, '0xd9a441')},${text(2, 17, 395, '0xa8a29b')},${text(3, 13, 670, '0x6f6a64')},drawtext=fontfile='${filterPath(font)}':text='Built with stx + Craft':fontsize=13:fontcolor=0x6f6a64:x=58:y=700[out]`,
    ].join(';')
    run(['-loop', '1', '-i', resolve(dirname(manifest), scene.image), '-loop', '1', '-i', join(root, 'src/assets/icon_512@2x.png'), '-f', 'lavfi', '-i', `color=c=0x17161a:s=1000x740:r=10:d=${seconds}`, '-filter_complex', filters, '-map', '[out]', '-t', String(seconds), '-c:v', 'ffv1', clip])
    clips.push(clip)
  }
  const list = join(dir, 'clips.txt')
  await writeFile(list, clips.map(file => `file '${file}'`).join('\n'))
  run(['-f', 'concat', '-safe', '0', '-i', list, '-filter_complex', 'fps=10,split[a][b];[a]palettegen=stats_mode=diff:reserve_transparent=0:max_colors=192[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', output])
  console.log(`Generated ${output} from ${demo.scenes.length} native screenshots`)
}
finally {
  await rm(dir, { recursive: true, force: true })
}
