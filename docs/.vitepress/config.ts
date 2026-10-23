import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Barista',
  description: 'Keep your Mac awake and hide a chosen group of menu bar icons.',
  themeConfig: {
    nav: [{ text: 'Guide', link: '/intro' }, { text: 'GitHub', link: 'https://github.com/stacksjs/barista' }],
    sidebar: [
      { text: 'Introduction', link: '/intro' },
      { text: 'Keep awake', link: '/caffeinate' },
      { text: 'Configuration', link: '/config' },
      { text: 'Releasing', link: '/releasing' },
    ],
  },
})
