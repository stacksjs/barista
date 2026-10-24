import { cp, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildStaticSite } from '@stacksjs/stx'
import { site } from '../resources/data/site'

const url = process.env.SITE_URL || 'http://localhost:4173'
const origin = new URL(url)
if (origin.pathname !== '/' || !['http:', 'https:'].includes(origin.protocol))
  throw new Error('SITE_URL must be an HTTP(S) origin. The site is served at its domain root.')

const result = await buildStaticSite({
  name: site.name,
  url: origin.origin,
  description: site.description,
  pagesDir: 'resources/views',
  publicDir: 'resources/public',
  outDir: 'storage/site',
  spa: false,
  theme: { default: 'auto', storageKey: 'barista-site-theme' },
  sitemap: !!process.env.SITE_URL,
  robots: process.env.SITE_URL
    ? `User-agent: *\nAllow: /\nSitemap: ${origin.origin}/sitemap.xml\nSitemap: ${origin.origin}/docs/sitemap.xml\n`
    : 'disallow',
  seo: {
    title: 'Barista | Keep your Mac awake',
    description: site.description,
    image: '/assets/awake.jpg',
    favicon: '/assets/icon.png',
  },
  pages: { '/404': { title: 'Page not found | Barista', sitemap: false } },
})

if (!result.pages.includes('/') || !result.pages.includes('/404'))
  throw new Error(`Site build is missing a required page: ${result.pages.join(', ')}`)

const assets = resolve(result.outDir, 'assets')
await mkdir(assets, { recursive: true })
await cp('src/assets/icon_512@2x.png', resolve(assets, 'icon.png'))
for (const scene of ['awake', 'timed', 'grouping', 'updates'])
  await cp(`.github/art/demo/${scene}.jpg`, resolve(assets, `${scene}.jpg`))

const docs = Bun.spawn([process.execPath, 'run', 'build:docs'], { stdout: 'inherit', stderr: 'inherit' })
if (await docs.exited !== 0)
  throw new Error('BunPress documentation build failed')
// BunPress owns its .bunpress output. Compose that published tree into the site.
await cp('storage/framework/docs/.bunpress', resolve(result.outDir, 'docs'), { recursive: true })
console.log(`Marketing page built in ${result.durationMs}ms: ${result.outDir}`)
