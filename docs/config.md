# Configuration

Right-click Barista’s cup and choose **Preferences…**. Left-click the cup or
press **⌘⇧C** to start or stop keep-awake.

| Setting | Behavior |
| --- | --- |
| For how long | 5m, 15m, 30m, 1h, 2h, 4h, 8h or ∞. Choosing one starts or replaces the session. |
| Start awake | Starts a session with the saved duration whenever Barista opens. |
| Open at login | Registers Barista to open when you sign in. |
| Hide a group of app icons | Adds one compact group control on supported direct builds. |

New installs use **∞**, **Start awake** and **Open at login** by default.
Existing saved choices are preserved. Turn Off releases the current session’s power assertions.

## Choose which app icons to hide

Icon hiding requires **macOS 27**, the direct build and Accessibility access.
Enable grouping and choose **Open System Settings…**, then enable Barista under **Privacy & Security → Device Control and Data Access**. This is macOS 27’s Accessibility permission and grants broad UI access; Barista uses it to read icon positions. Choose
**Arrange…** to reveal everything, then hold ⌘ and drag app icons left of
Barista’s arrow. Click the arrow or press **⌘⇧B** to hide/reveal that group.

Craft implements the native visibility backend at its source. It uses the
private MenuBarClientCore API researched by [Hidden Bar](https://github.com/dwarvesf/hidden).
Apple can change it. If unavailable, Barista leaves icons visible and explains
why; it does not fall back to a wide spacer. This feature cannot be used in
App Store submissions.

Hiding applies per app. When one app owns several icons, keeping any one of them
on the visible side keeps all of them visible. Craft protects Barista and checks
that the visible side and system controls survive activation. If macOS hides
anything outside the group, Craft releases the restriction and restores the bar.
An empty group never activates a restriction. Missing Accessibility geometry is
kept visible. Apps launched while collapsed may remain hidden until you reveal
the group again.

macOS 27.0.1 can suppress Focus and loosely packaged native helpers despite the
allow-list. In such an arrangement, Barista reports that icons were restored;
grouping is unavailable for that layout. Keep-awake continues independently.

The group starts revealed. Disabling grouping or quitting restores its icons.
When revealed icons do not fit, macOS manages its own overflow presentation;
Barista cannot pin app menus above the system overflow UI.

## Saved preferences

Preferences are stored in `~/Library/Application Support/barista/`. Keep-awake,
duration, login and Dock choices survive upgrades. Old spacer, always-hidden and
auto-collapse settings are removed during migration.

`BARISTA_PREFERENCES_PATH` selects an isolated preference file for native tests.
An isolated profile does not register or remove the installed app’s login item.
