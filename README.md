<p align="center"><img src=".github/art/barista.gif" alt="Barista Logo" width="100%"></p>

[![GitHub Actions][github-actions-src]][github-actions-href]
[![macOS](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://img.shields.io/badge/platform-macOS-lightgrey.svg)

# Barista

> Stay caffeinated & craft pretty menu bars.

A lightweight macOS menubar utility built with [stx](https://github.com/stacksjs/stx) + [Craft](https://github.com/stacksjs/craft). Barista lives in your menu bar and helps you manage menu bar clutter and prevent your Mac from sleeping.

## Features

- **Caffeinate** — Prevent your Mac from sleeping with customizable durations (15m, 30m, 1h, 4h, 8h, 12h, indefinite)
- **Menu Bar Management** — Collapse and organize your menu bar items
- **Auto Collapse** — Automatically hide menu bar items after a delay
- **Launch at Login** — Start Barista when you log in
- **Native Performance** — Built with Craft's native webview (1.4MB binary, <100ms startup)
- **Beautiful UI** — Dark-themed popup window with intuitive controls

## Get Started

```bash
bun install
bun run dev
```

## Development

```bash
# Run the app in development mode
bun run dev

# Lint
bun run lint
bun run lint:fix

# Build for production
bun run build
```

## Architecture

Barista is built as a native macOS menubar app using:

- **[stx](https://github.com/stacksjs/stx)** — Template engine for the UI (`.stx` files)
- **[Craft](https://github.com/stacksjs/craft)** — Native webview framework (Zig-powered, Electron alternative)
- **[@stacksjs/desktop](https://github.com/stacksjs/stx/tree/main/packages/desktop)** — Desktop APIs (power management, preferences, system tray)

```
app.ts                 Entry point: starts server + Craft window
src/barista.stx        UI template (popup window)
src/server.ts          Local HTTP server (API + template rendering)
src/caffeinate.ts      Caffeinate process management
src/menu.ts            System tray menu builder
src/preferences.ts     App preferences (JSON storage)
```

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
