# Website deployment

The production target is [barista.stacksjs.com](https://barista.stacksjs.com), with documentation
under **/docs/**. `config/cloud.ts` declares a static ts-cloud site attached to
the existing `stacks` production server. Barista owns the
`/etc/rpx/sites.d/barista.json` gateway fragment and the
`/var/www/barista-marketing` release directory. It does not provision a server.

## Publish

Install the locked dependencies and provide the shared host’s existing Hetzner
and Cloudflare credentials through the deployment environment. ts-cloud uses
`HCLOUD_TOKEN`, `CLOUDFLARE_API_TOKEN` and the local SSH key.
Credentials stay private and are not part of the website artifact.

```sh
bun install --frozen-lockfile
bun run check
bun run deploy:site:plan
bun run deploy:site
```

The deploy runs the combined site build with
`SITE_URL=https://barista.stacksjs.com`, checks its links and assets, and packages
only `storage/site/`. The native app, repository, local release credentials and
dependencies are outside that upload boundary.

ts-cloud resolves the Stacks host by its provider labels, publishes Barista’s
release, and writes its own additive rpx gateway fragment. Cloudflare manages the
hostname’s address records; rpx handles HTTPS certificates. The static route
uses directory clean URLs, so `/docs/intro` resolves to the BunPress page at
`docs/intro/index.html`. SPA fallback is disabled so missing URLs remain 404s.

## Verify

After deployment, compare the live responses against the production build:

```sh
SITE_URL=https://barista.stacksjs.com bun run build:site
bun run verify:site
```

The verifier checks the HTTPS home page, every built documentation page, both
sitemaps, robots rules, images, styles and scripts against their SHA-256 hashes.
It also checks clean routes, production canonical URLs, HTTP-to-HTTPS redirects
and missing URLs at the root and under `/docs/`. Reserved 404 templates are not
successful routes; the static gateway returns its native HTTP 404 response.
The build checks search result destinations and heading fragments too.

Confirm the GitHub release download link in a browser.
Test the screenshot selector with pointer and keyboard, both appearance modes,
and the guide’s navigation and search in a browser at desktop and phone widths.

The server’s `current` link identifies the active immutable release. ts-cloud
preserves prior releases; use its release management commands for rollback.
Keep the `barista` project slug distinct from `stacks` and other tenants, and
preserve every domain owned by Barista’s gateway fragment on later deployments.

The GitHub `site` CI job builds and uploads a reviewable artifact. Production
publishing is the explicit `deploy:site` command; CI does not receive the shared
host’s provider credentials.
