<p align="center"><img src="https://github.com/stacksjs/barista/blob/main/.github/art/cover.jpg?raw=true" alt="Social Card of this repo"></p>

# Keep your Mac awake

> Barista is a tiny, native macOS menu bar app that prevents your Mac from sleeping — a free replacement for Caffeine, Amphetamine and KeepingYouAwake.

One click to caffeinate, pick a duration (15m, 30m, 1h, 4h, 8h, 12h, or indefinite), and your Mac stays awake until you say otherwise. As a bonus, Barista also tidies up your menu bar.

## Why Barista

- **Caffeinate-first** — the headline feature, not buried under preferences.
- **Tiny** — 1.4 MB binary, under 100 ms cold start.
- **Native** — built with Zig-powered [Craft](https://github.com/stacksjs/craft), no Electron, no Chromium.
- **Free & open source** — MIT-licensed, no subscription, no telemetry.

## Get Started

```bash
# Clone and run
git clone https://github.com/stacksjs/barista.git
cd barista
bun install
bun run dev
```

Once running, look for the ☕️ icon in your menu bar. Click it to caffeinate, choose a duration, and you're done.

For details on what caffeinate actually does (display sleep vs system sleep, lid-close behavior, etc.), see the [Caffeinate guide](./caffeinate.md).

## What's next

- [Caffeinate guide](./caffeinate.md) — durations, edge cases, and how it compares to `caffeinate(1)`.
- [Configuration](./config.md) — preferences, hotkeys, launch-at-login.

## Changelog

Please see our [releases](https://github.com/stacksjs/barista/releases) page for more information on what has changed recently.

## Contributing

Please review the [Contributing Guide](https://github.com/stacksjs/contributing) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/stacks/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## Credits

- [Hidden Bar](https://github.com/dwarvesf/hidden) for being the initial code inspiration
- [Chris Breuer](https://github.com/chrisbbreuer)
- [All Contributors](https://github.com/stacksjs/barista/graphs/contributors)

## License

The MIT License (MIT). Please see [LICENSE](https://github.com/stacksjs/barista/blob/main/LICENSE.md) for more information.

Made with 💙
