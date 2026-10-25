# Website development

The marketing page uses the same Stacks frontend features as `~/Code/stacks`:
stx templates, shared layouts and partials, callable signals, native `x-model`
form bindings, ts-css utilities, and stx’s `buildStaticSite` pipeline. The guide
uses Stacks’ BunPress documentation engine. Neither build needs the Craft runtime.

## Source map

| Source | Purpose |
| --- | --- |
| `resources/views/` | Marketing home and a dedicated 404 page. |
| `resources/layouts/site.stx` | Shared document shell and resource hints. |
| `resources/partials/` | Navigation and footer. |
| `resources/components/AppPreview.stx` | Layered hero UI rendered directly with stx. |
| `resources/components/NativeScreenshot.stx` | Reusable, focused real-app capture. |
| `resources/data/site.ts` | Product metadata and stable GitHub release links. |
| `resources/assets/site.css` | Semantic theme tokens and product-specific styles. |
| `config/ui.ts`, `config/css.ts` | Stacks template topology and ts-css extraction. |
| `docs/`, `bunpress.config.ts` | Documentation source and navigation. |
| `scripts/build-site.ts` | stx static build and copying real product assets. |

## Build and preview

```sh
bun install --frozen-lockfile
bun run build:site
bun run preview:site
```

Open [local preview](http://localhost:4173). The preview serves the final static output,
including extensionless documentation routes and a real HTTP 404 response.
Set `PORT` to use another port. Run `bun run build:site` after editing sources.
For documentation-only live development, use `bun run dev:docs`.

The combined build writes **`storage/site/`**. Documentation goes under
`storage/site/docs/`, copied from BunPress’s `storage/framework/docs/.bunpress/`
publish tree. The native app’s `dist/` directory is separate. Build output
is ignored by Git; CI uploads it as a reviewable artifact. The build itself
does not publish. Pushes to `main` deploy automatically after all CI checks pass.
[Website deployment](./deployment.md) describes the Stacks ts-cloud target at
`barista.stacksjs.com`, CI credentials, verification and manual publishing.

For a production build, set the site’s real origin:

```sh
SITE_URL=https://your-domain.example bun run build:site
```

`SITE_URL` must be an HTTP(S) origin served at its domain root, without a path
prefix. stx produces canonical metadata, social tags, a sitemap and robots rules.
Without `SITE_URL`, the build uses localhost and disallows indexing. Static
hosting must resolve `/docs/intro` to `/docs/intro/index.html`, directory URLs to
`index.html`, and missing paths to HTTP 404. The production gateway returns its
native error response; the local preview uses the generated 404 page. HTTPS and
cache headers belong to the hosting configuration.

## Assets and design

The app icon comes from `src/assets/icon_512@2x.png`. Screenshots come from
`.github/art/demo/{awake,timed,grouping,updates}.jpg`, the same real packaged-app
stx interface captures used by the README animation, taken from the installed
app at its 320 × 740 panel viewport. Native window behavior is verified
separately. The build copies these into `/assets/`;
there is no second screenshot source to maintain. Refresh them after relevant
native UI changes, then run `bun scripts/generate-demo.ts` for the README GIF.

The design follows Stacks’ `stacks-design-taste`, `stacks-design-minimalist` and
`stacks-design-output` skills, with variance 6, motion 3 and density 3. It uses
system sans typography, neutral surfaces, one green accent, 8px control radii,
12px image radii, and no automatic motion. The hero uses three overlapping,
slightly angled stx renderings of the app interface. The gallery and README
animation use actual packaged interface captures. No generated artwork stands
in for app controls.

The page follows system appearance and offers a theme switch through stx’s
built-in bootstrap. Tokens cover both themes. The screenshot selector uses
native radio controls with stx signals, so it works with pointer and keyboard.
Links and explanatory text remain available without JavaScript.

## Verification

```sh
bun run check
bun run build:site
```

The site build checks local links, fragments, referenced assets, required pages,
and unresolved template errors. Before shipping a UI change, also review the
built page at desktop and phone widths, in light and dark appearance, and test
the screenshot selector, keyboard focus, download link, docs navigation and 404.
Use Buddy for dependency upgrades. App/native changes still require the native
verification commands in the root README.
