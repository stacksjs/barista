# Configuration

Right-click Barista’s cup and choose **Preferences…**. Left-click the cup or
press **⌘⇧C** to start or stop keep-awake.

| Setting | Behavior |
| --- | --- |
| For how long | 5m, 15m, 30m, 1h, 2h, 4h, 8h or ∞. Choosing one starts or replaces the session. |
| Start awake | Starts a session with the saved duration whenever Barista opens. |
| Open at login | Opens Barista when you sign in. |
| Hide a group of menu bar icons | Adds one compact group control on supported direct builds. |

New installs use **∞** and **Start awake**. The GitHub edition enables
**Open at login** and grouping by default. The sandboxed Store edition has no
grouping and leaves **Open at login** off until you enable its native login
item. Existing saved choices are preserved within each edition. Turn Off
releases the current session’s power assertions. Keep-awake works independently
of icon grouping.

## Choose which icons to hide

The direct build supports positional grouping on macOS 15 and newer.

1. Enable **Hide a group of menu bar icons** in Preferences.
2. Choose **Arrange…** and hold ⌘ to drag unwanted icons to the left of `>`.
3. Click `>` or choose **Hide Grouped Icons** to hide only the icons on its left.
4. Click `<`, choose **Reveal Hidden Icons**, or press **⌘⇧B** to reveal the group.

Icons on the right stay visible. Each icon follows its own position, even if
another icon from the same app is on the other side. The cup can be in the hidden
group; the arrow remains available to reveal it.

## Native behavior

Craft reserves native status-bar space to tuck the left group away. Barista
consumes its public grouping API and does not need Accessibility authorization.
The arrow points right when expanded and left when collapsed. The group starts
revealed; disabling grouping or quitting restores it.

When revealed icons do not fit, macOS owns system overflow. The App Store edition
continues to provide keep-awake without icon grouping.

## Saved preferences

The GitHub edition stores preferences in
`~/Library/Application Support/barista/`; the sandboxed edition uses its app
container. Keep-awake, duration, login and Dock choices survive upgrades within
the same edition. Old spacer, always-hidden and auto-collapse settings are
removed during migration.

`BARISTA_PREFERENCES_PATH` selects an isolated preference file for native tests.
An isolated profile does not change the installed app’s login item.

## Switching editions

Use one edition at a time. Before replacing the GitHub app with the Store
edition, turn off **Open at login** in the GitHub app and quit it. The Store
edition uses the macOS login service and its own sandboxed preferences; it
cannot remove a LaunchAgent created outside its sandbox. Enable its login
setting after installation if you want it to start when you sign in.
