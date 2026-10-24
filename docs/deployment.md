# Website deployment

The production target is [barista.stacksjs.com](https://barista.stacksjs.com), with documentation
under **/docs/**. `config/cloud.ts` declares a static ts-cloud site attached to
the existing `stacks` production server. Barista owns the
`/etc/rpx/sites.d/barista.json` gateway fragment and the
`/var/www/barista-marketing` release directory. It does not provision a server.

## Publish

Every push to `main` runs lint, type checks, unit tests, packaged native checks
and the production site build. Once all four CI jobs pass, `deploy-site` runs
`bun run deploy:site` through Stacks ts-cloud and then `bun run verify:site`.
Pull requests build and test the site without deploying.

Production deployments share one queue and a running deployment is allowed to
finish. A queued commit superseded by a newer main-branch push skips publishing,
so an older CI run cannot replace the latest branch head.

The GitHub `website-production` environment allows only the `main` branch. It
provides `HCLOUD_TOKEN`, `CLOUDFLARE_API_TOKEN` and `DEPLOY_SSH_KEY`. The SSH key is
dedicated to Barista CI, is trusted by the existing Stacks host, and is removed
from the runner after every job. The native app's signing and notarization
credentials are separate from website deployment.

## Manual deployment

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

After a manual `bun run deploy:site`, compare the live responses against the
exact build it left in `storage/site/`:

```sh
bun run verify:site
```

For an automatic deployment, download the verified production artifact from
that successful CI run. Replace the run ID and full commit SHA below:

```sh
gh run download RUN_ID --name barista-site-production-COMMIT_SHA --dir /tmp/barista-production-build
SITE_ARTIFACT_DIR=/tmp/barista-production-build bun run verify:site
```

Use an empty destination directory for each download. Production artifacts are
retained for seven days. stx assigns build and setup IDs during compilation;
rebuilding independently produces different bytes. Compare with the deployed
artifact, rather than regenerating the site or ignoring those differences.

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

The GitHub `site` CI job also uploads a reviewable build as `barista-site`.
It is separate from the deployed build. The `deploy-site` job retains its exact
verified output as `barista-site-production-COMMIT_SHA` for later checks. The
`deploy-site` job reports a deployment to `website-production`; its verification
step must pass before the workflow is green. A failed deployment or verification
remains a failed CI run. Re-running a main-branch workflow retries deployment
provided its commit has not been superseded.
