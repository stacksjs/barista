import pkg from '../../package.json' with { type: 'json' }

/** Release links follow GitHub's latest release, rather than a pinned artifact. */
export const site: {
  name: string
  version: string
  description: string
  github: string
  download: string
} = {
  name: 'Barista',
  version: pkg.version,
  description: 'Keep your Mac awake and your menu bar tidy. A free, open-source macOS utility built with stx and Craft.',
  github: 'https://github.com/stacksjs/barista',
  download: 'https://github.com/stacksjs/barista/releases/latest',
}
