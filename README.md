<p align="center"><img src=".github/art/barista.gif" alt="Barista Logo" width="100%"></p>

[![GitHub Actions][github-actions-src]][github-actions-href]
[![macOS](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://img.shields.io/badge/platform-macOS-lightgrey.svg)

# Barista

> Keep your Mac awake. One click from the menu bar.

Barista keeps your Mac awake from the menu bar, with timed or indefinite sessions.
Barista starts in the menu bar with its preferences hidden. Left-click the cup
to start or stop; right-click for durations and preferences.
It also organizes menu bar icons using macOS's native ⌘-drag gesture.

Built with [stx](https://github.com/stacksjs/stx) and
[Craft](https://github.com/craft-native/craft), using the system WebKit view
and native macOS power assertions. The packaged app includes its own runtime.

## Features

- **Caffeinate, primarily** — Prevent system sleep, display sleep and idle sleep with customizable durations (5m, 15m, 30m, 1h, 2h, 4h, 8h, indefinite). **Left-click the cup** to brew or stop; the icon fills while your Mac is awake and the remaining time is on hover.
- **Right-click for everything else** — A native menu with the current status, the durations, the menu bar controls, preferences and updates.
- **Caffeinate on startup** — Optional: start the app already caffeinated, so your Mac is awake the moment you log in.
- **Global hotkey** — ⌘⇧C toggles keep-awake; ⌘⇧B expands or collapses the menu bar.
- **Menu bar management** *(bonus)* — Collapse and organize menu bar items, with native ⌘-drag rearrangement and optional auto-collapse. Right-click the cup and choose **Arrange Menu Bar Items** to reveal the icons and open the controls. Use ⌘⇧B or the menu to reveal hidden items.
- **Launch at login** — Start Barista when you log in.
- **Self-updating** — Checks its own GitHub releases, verifies the download by SHA-256, and can install and relaunch.
- **Native integration** — Native status items, menus, keyboard shortcuts and power assertions, with a system WebKit preferences view.
- **Beautiful UI** — Dark-themed popup window with intuitive controls.

## Get Started

Requires macOS 15 or newer, matching the bundled Craft runtime.
Building requires Pantry 0.11.114 or newer and Craft 0.0.293 or newer for native menu bar grouping.

```bash
pantry install
bun install
pantry run dev
```

To group menu bar icons, hold ⌘ and drag them left of Barista's `|` divider.
Click the divider to hide the group, then its `›` control to reveal it again;
⌘⇧B works from any app. These controls are separate from macOS's double-chevron
overflow control. Barista releases its reserved space when native overflow moves
the group, keeping the empty divider out of the application menus.

## Development

```bash
# Run the app in development mode
pantry run dev

# Lint
bun run lint
bun run lint:fix

# Build a distributable .app + .dmg (and a signed .pkg when signing is configured)
pantry run build
```

Set `APPLE_SIGNING_IDENTITY` for a signed direct build. Direct builds use
`barista.direct.entitlements` for the Bun host; App Store builds use the separate
sandboxed `barista.entitlements` and require both signing identities.

## Verification

```bash
bun run check
pantry run build
bun run test:native
```

The native E2E suite launches the packaged `.app` with an isolated preference
profile and only system tools on PATH, waits for its real WebKit view to initialize the menu bar, checks
macOS power assertions, switches timed/indefinite sessions, validates rejected
inputs, and verifies shutdown, native auto-collapse and Start Awake after relaunch. CI verifies an ad hoc signed bundle and runs it
against both the packaged app and its read-only DMG before release publishing. Timed expiry is covered in stx's native
power tests. Physical ⌘-drag placement still requires a macOS desktop check.

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
build.ts               Compile + package (DMG, and App Store .pkg when signed)
src/barista.stx        The popup — signals-driven, no vanilla DOM code
src/caffeinate.ts      Named wrapper over the desktop power API
src/tray.ts            The menu bar item: its cup icon and its menu
src/durations.ts       The durations the popup and tray both offer
src/preferences.ts     Preference shape and defaults
src/updates.ts         Self-update from GitHub releases
```

See the stx guide, [Menu Bar Apps](https://github.com/stacksjs/stx/blob/main/docs/guide/menubar.md),
for the pattern.

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## Credits

- [Hidden Bar](https://github.com/dwarvesf/hidden) for being the initial code inspiration
- [Bartender](https://www.macbartender.com)
- [Chris Breuer](https://github.com/chrisbbreuer)
- [All Contributors](../../contributors)

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/barista/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/barista/actions?query=workflow%3Aci
