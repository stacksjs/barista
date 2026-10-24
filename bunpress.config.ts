import type { BunPressConfig } from '@stacksjs/bunpress'

const origin = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : undefined

const config: BunPressConfig = {
  title: 'Barista',
  description: 'Keep your Mac awake and choose a group of menu bar icons to hide.',
  url: origin ? `${origin}/docs` : undefined,
  docsDir: 'docs',
  outDir: 'storage/framework/docs',
  basePath: '/docs',
  darkMode: 'auto',
  nav: [
    { text: 'Home', link: `${origin || 'http://localhost:4173'}/` },
    { text: 'Guide', link: '/intro' },
    { text: 'GitHub', link: 'https://github.com/stacksjs/barista' },
  ],
  sidebar: [
    { text: 'Overview', link: '/' },
    { text: 'Get started', link: '/intro' },
    { text: 'Keep awake', link: '/caffeinate' },
    { text: 'Configuration', link: '/config' },
    { text: 'Updates', link: '/updates' },
    { text: 'Releasing', link: '/releasing' },
    { text: 'Website development', link: '/site' },
    { text: 'Website deployment', link: '/deployment' },
  ],
  themeConfig: {
    colors: { primary: '#2c6550' },
    css: 'html.dark { --bp-c-brand-1: #a4cfb5; --bp-c-brand-2: #c8e0d1; --bp-c-brand-3: #2c6550; }',
    fonts: { heading: '-apple-system, BlinkMacSystemFont, sans-serif', body: '-apple-system, BlinkMacSystemFont, sans-serif' },
    footer: { message: 'Free and open source. Released under the MIT license.' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/stacksjs/barista' }],
  },
  sitemap: { enabled: !!origin, baseUrl: origin ? `${origin}/docs` : undefined },
  robots: { enabled: false },
}

export default config
