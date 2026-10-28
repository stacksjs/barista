# Get started

Barista keeps your Mac awake from a cup in your menu bar. A separate compact
arrow hides and reveals the icon group you choose.

## Install

1. Download the DMG from [GitHub Releases](https://github.com/stacksjs/barista/releases/latest).
2. Open the DMG and drag **Barista** into **Applications**.
3. Launch Barista from Applications.

The packaged app requires **macOS 15 or newer on Apple Silicon**. It includes
the Craft runtime; Pantry and Bun are only needed for development.

## Keep your Mac awake

Barista starts awake indefinitely and opens at login by default. Left-click
the cup or press **⌘⇧C** to start or stop. Right-click the cup for durations,
Preferences and updates. Hover over the cup for the remaining time.

Preferences offers **5m, 15m, 30m, 1h, 2h, 4h, 8h and ∞**. Picking a duration
starts a session immediately. Turn off **Start awake** or **Open at login** if
you prefer. Existing saved choices survive upgrades.

See [Keep awake](./caffeinate.md) for manual sleep and lid-close behavior.

## Choose a hidden group

In the direct build, ⌘-drag unwanted icons to the left of `>`. Click `>` to
hide only those icons, then click `<` to reveal them. Icons on the right stay
visible. Press **⌘⇧B** to toggle the group.

See [Configuration](./config.md) for grouping and system overflow behavior.

## Develop from source

```sh
git clone https://github.com/stacksjs/barista.git
cd barista
pantry install
bun install --frozen-lockfile
pantry run dev
```

Native implementation belongs in stx and Craft. App sources stay in TypeScript
and `.stx`. See the [README](https://github.com/stacksjs/barista#readme) for the
source architecture and verification commands.
