<p align="center"><img src=".github/art/barista.gif" alt="Barista native keep-awake, menu bar grouping and update demo" width="100%"></p>

[![GitHub Actions][github-actions-src]][github-actions-href]
[![macOS](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://img.shields.io/badge/platform-macOS-lightgrey.svg)

# Barista

> Keep your Mac awake. Keep your menu bar tidy.

Barista keeps your Mac awake from the menu bar, with timed or indefinite sessions.
Barista starts in the menu bar with its preferences hidden. Left-click the cup
to start or stop; right-click for durations and preferences.
A separate compact arrow hides and reveals a group of menu bar icons you choose with native ⌘-drag.

Built with [stx](https://github.com/stacksjs/stx) and
[Craft](https://github.com/craft-native/craft), using the system WebKit view
and native macOS power assertions. The packaged app includes its own runtime.

## Features

- **Keep awake in one click** — Prevent idle sleep with preset durations (5m, 15m, 30m, 1h, 2h, 4h, 8h, indefinite). **Left-click the cup** to brew or stop; the icon fills while your Mac is awake and the remaining time is on hover.
- **Right-click for everything else** — A native menu with the current status, durations, preferences and updates.
- **Awake on startup** — Start awake indefinitely by default. The GitHub edition also opens at login by default; the Store edition asks you to enable Open at Login in Preferences.
- **Global hotkey** — ⌘⇧C toggles keep-awake.
- **Native icon grouping** — ⌘-drag unwanted icons left of Barista’s arrow, then click it to hide or reveal the group. Click `>` to hide only the icons on its left; click `<` to reveal them. Icons on the right stay visible. ⌘⇧B toggles the group.
- **Launch at login** — Start Barista when you log in.
- **Updates for each edition** — The GitHub edition checks its releases, verifies SHA-256, Apple notarization and Barista’s signing team, then installs and restarts. The Store edition receives updates through the Mac App Store.
- **Native integration** — Native status items, menus, keyboard shortcuts and power assertions, with a system WebKit preferences view.
- **Preferences in one place** — A dark preferences window for durations, startup behavior, grouping and updates.

## Get Started

The packaged download requires macOS 15 or newer on Apple Silicon, matching the bundled Craft runtime.
Icon grouping is available in the direct build on macOS 15 and newer.

Download the DMG from [GitHub Releases](https://github.com/stacksjs/barista/releases/latest),
open it and drag **Barista** to **Applications**. Launch Barista from there.
It starts awake indefinitely and opens at login by default. Right-click the cup
for Preferences, durations and updates.

## Editions

Both editions provide native keep-awake, timers, the ⌘⇧C shortcut and login
settings. The GitHub edition includes icon grouping and its verified updater.
The sandboxed Mac App Store edition excludes grouping. It uses Craft’s public-only
runtime and native login registration, with Open at Login off until enabled.
As of October 25, 2026, Store version 0.0.9 is uploaded and awaiting Apple’s
export-compliance approval before App Review submission. Use GitHub Releases
for the available download; the automated Store workflow records its current
phase in [Actions](https://github.com/stacksjs/barista/actions/workflows/store-submission.yml).

Keep-awake controls idle sleep. It does not override manual sleep, lid-close
behavior, shutdown or macOS power protections. See the [keep-awake guide](./docs/caffeinate.md).

To build from source, install native tools with Pantry and app dependencies with Bun:

```bash
pantry install
bun install --frozen-lockfile
pantry run dev
```

## Choose your hidden group

1. Open Preferences and enable **Hide a group of menu bar icons**.
2. Choose **Arrange…**, then hold ⌘ and drag unwanted icons left of `>`.
3. Click `>` to hide those icons. Icons on the right stay visible.
4. Click `<`, choose **Reveal Hidden Icons**, or press ⌘⇧B to reveal the group.

Craft owns the native positional grouping. It reserves status-bar space to tuck
individual icons on the left away, without applying a system-wide application
allow-list. Different icons from the same app can be on different sides. The
arrow remains the reveal control even if the cup is in the hidden group.

Grouping does not require Accessibility authorization. It starts revealed and
returns to that state when disabled or when Barista quits. macOS owns system
overflow when the revealed icons exceed available space. The App Store edition
continues to offer keep-awake without icon grouping.

Upgrades preserve awake, duration, login and Dock choices while retiring the old
separator, always-hidden and auto-collapse settings.

## Development

```bash
# Run the app in development mode
pantry run dev

# Lint
bun run lint
bun run lint:fix

# Build a distributable .app + .dmg
pantry run build
```

Set `APPLE_SIGNING_IDENTITY` for a signed direct build. Direct builds use
`barista.direct.entitlements` for the Bun host. `pantry run build:app-store`
packages the separate sandboxed edition with Craft as the native app host and
an inherited Bun backend. It requires Store signing identities and a matching
provisioning profile. See [Releasing](./docs/releasing.md).

## Releases

Release credentials live locally in `.env`. Prepare `.env.production` from the
local signing and notarization values, then encrypt it with Buddy Env before
staging it:

```bash
bunx --bun @stacksjs/buddy@0.75.299 env:encrypt --file .env.production --file-keys .env.keys
```

Commit only the encrypted `.env.production`. Keep `.env`, `.env.keys`, `.p8`
and `.p12` files private. GitHub stores `DOTENV_PRIVATE_KEY_PRODUCTION` as a
repository secret. Release CI decrypts credentials into temporary runner files,
imports the Developer ID identity with Pantry, notarizes and staples the app and
DMG, then removes the plaintext files.

When refreshing a credential, start from the existing encrypted file so Buddy
can retain its encryption key. If you create a new key, update the matching
GitHub repository secret from `.env.keys` before releasing.

After verification, `bun run release:patch` creates and pushes the next version
tag. That tag starts both edition workflows. The direct release stages the DMG
and `update.json` as a prerelease after packaged-app checks, then tests a real
previous-to-new updater replacement and native restart before promoting it to
latest. The Store flow verifies its sandboxed package, generates current
screenshots through stx, uploads to Apple and submits for review once compliance
is approved. A resume workflow checks Apple every six hours and reports the
precise waiting or release phase. See [Releasing](./docs/releasing.md).
Installed copies download the direct update in the background;
**Install and restart** becomes available after the download verifies.

The README animation uses captures of the installed app’s actual stx interface
at its native panel size; its native window is verified separately. After
refreshing `.github/art/demo/` and recording the current version, regenerate it with
`bun scripts/generate-demo.ts` (requires FFmpeg through Pantry).

## Verification

```bash
bun run check
pantry run build
bun run test:native
```

The native E2E suite clones and signs the packaged `.app` with unique app and
runtime identities, an isolated preference profile and an empty working directory.
It uses only system tools on PATH, waits for its real WebKit view to initialize the tray and shortcuts, checks
macOS power assertions, switches timed/indefinite sessions, validates rejected
inputs, verifies native positional grouping, and checks shutdown and Start Awake after relaunch. CI verifies an ad hoc signed bundle and runs it
against both the packaged app and its read-only DMG before release publishing. Timed expiry is covered in stx's native
power tests. Craft also verifies that a packaged positional group stays collapsed until explicitly revealed. Physical ⌘-drag placement still requires a macOS desktop check.

## Architecture

The app source is TypeScript and `.stx`; Swift and Kotlin belong outside this app.
Native implementation stays in stx/Craft, exposed through their public APIs.

Barista is a [stx](https://github.com/stacksjs/stx) menu bar app. `@stacksjs/stx`
is the only dependency — it wraps [Craft](https://github.com/craft-native/craft), the
Zig-powered native webview, and the desktop APIs (power management, preferences,
system tray) behind one package.

`createMenuBarApp` from `@stacksjs/stx/menubar` owns the local server, the
preference store and the login item, so the app is a declaration rather than a
runtime:

```
app.ts                 createMenuBarApp: context, routes, tray menu
build.ts               Compile + package the direct DMG or sandboxed Store PKG
src/barista.stx        Preferences, with stx signals and native composables
src/caffeinate.ts      Named wrapper over the desktop power API
src/tray.ts            The menu bar item: its cup icon and its menu
src/durations.ts       The durations the popup and tray both offer
src/preferences.ts     Preference shape and defaults
src/updates.ts         Self-update from GitHub releases
```

See the stx guide, [Menu Bar Apps](https://github.com/stacksjs/stx/blob/main/docs/guide/menubar.md),
for the pattern.

## Website and documentation

The marketing page is built with the Stacks frontend: stx layouts, partials and
components, signals, native form bindings, and ts-css. The guide uses BunPress.
Sources live in [`resources/`](./resources/README.md) and [`docs/`](./docs/index.md).

```sh
bun run build:site
bun run preview:site
```

The combined static site is written to `storage/site/`, with the guide at
`/docs/`. Preview it at [local preview](http://localhost:4173). Native app builds continue to
use `dist/`. Set `SITE_URL` to the real production origin when building for a
host; these build and preview commands do not publish. CI builds the site,
checks its links and assets, and uploads the output as an artifact.

See [Website development](./docs/site.md) for the design, asset sources and
hosting requirements, [Configuration](./docs/config.md) for grouping limitations,
and [Releasing](./docs/releasing.md) for the encrypted CI credential flow.

The live site is [barista.stacksjs.com](https://barista.stacksjs.com), with the
[guide at /docs/](https://barista.stacksjs.com/docs/).
`bun run deploy:site:plan` previews the Stacks attachment; `bun run deploy:site`
publishes the static site and guide to that shared server. Pushes to `main`
automatically deploy through Stacks after CI passes, then verify the live build.
See
[Website deployment](./docs/deployment.md) for credentials, release boundaries
and live verification. `bun run verify:site` compares the deployed pages and
assets with the exact deployed build and checks HTTPS and missing URLs. CI
retains that production artifact for repeatable verification.

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## Credits

- [Hidden Bar](https://github.com/dwarvesf/hidden) for the grouping interaction and native visibility API research
- [Bartender](https://www.macbartender.com)
- [Chris Breuer](https://github.com/chrisbbreuer)
- [All Contributors](../../contributors)

## Sponsors

Support Barista and the Stacks ecosystem through
[GitHub Sponsors](https://github.com/sponsors/chrisbbreuer).

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/barista/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/barista/actions?query=workflow%3Aci
