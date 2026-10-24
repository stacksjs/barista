import type { CloudConfig } from '@stacksjs/ts-cloud'

/** The site attaches to Stacks' existing host; it owns no server lifecycle. */
export const tsCloud: CloudConfig = {
  project: { name: 'barista', slug: 'barista', region: 'us-east-1' },
  stateDir: 'storage/cloud',
  cloud: { provider: 'hetzner', attachTo: 'stacks' },
  mode: 'server',
  environments: {
    production: { type: 'production', deployBranch: 'main' },
  },
  infrastructure: {
    compute: {
      instances: 1,
      size: 'small',
      webServer: 'rpx',
      proxy: { engine: 'rpx', onDemandTls: true, onDemandTlsEmail: 'hello@stacksjs.com' },
    },
    dns: {
      provider: 'route53',
      domain: 'stacksjs.com',
      hostedZoneId: 'Z01455702Q7952O6RCY37',
    },
  },
  sites: {
    marketing: {
      deploy: 'server',
      root: 'storage/site',
      domain: 'barista.stacksjs.com',
      path: '/',
      build: 'SITE_URL=https://barista.stacksjs.com bun run build:site',
      pathRewriteStyle: 'directory',
      spa: false,
    },
  },
}

export default tsCloud
