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
of grouping permissions.

## Choose which icons to hide

Icon hiding requires **macOS 27**, the direct build and Accessibility access.

1. Enable **Hide a group of menu bar icons** in Preferences.
2. Choose **Open System Settings…** and enable Barista under **Privacy & Security → Device Control and Data Access**. This is macOS 27’s Accessibility permission.
3. Choose **Arrange…** to reveal everything. Hold ⌘ and drag unwanted icons left of Barista’s arrow.
4. Click the arrow, choose **Hide Grouped Icons**, or press **⌘⇧B**. Click again to reveal.

Keep the arrow visible while hiding. If macOS puts it in system overflow,
reveal it there first so Craft can read the boundary. The cup can be on either
side and stays visible. There are no pipe dividers or wide spacers.

## Native behavior and limits

Craft implements the private MenuBarClientCore visibility API researched by
[Hidden Bar](https://github.com/dwarvesf/hidden). Apple can change it. If the
backend is unavailable, Barista leaves icons visible and explains why. This
feature cannot be distributed through the App Store.

Selection follows the display containing the arrow. Native visibility applies
to selected applications or Apple controls across displays. Wi-Fi, Battery and
other identifiable Apple controls follow the same left-of-arrow boundary.

Hiding applies per app. If an app owns several icons, keeping any of them on
the visible side keeps the whole app visible. Craft preserves visible app and
helper signing identities. Craft reads the displayed native slot rather than
stale app coordinates, waits for the native layout to settle, and verifies that
selected apps disappear while visible apps remain. If macOS does not apply the
selection, it restores the bar and reports the failure. An empty group stays revealed;
ambiguous geometry is not guessed. Apps launched while collapsed may remain
hidden until you reveal the group.

On macOS 27.0.1 the private API can also suppress Focus, Now Playing and
camera/microphone activity indicators, even when those modules sit on the
visible side. Barista accepts this behavior, matching Hidden Bar. **Reveal the
group to restore those modules.**

The group starts revealed. Disabling grouping, quitting, permission loss or
activation errors restore its icons. When revealed icons do not fit, macOS
owns system overflow, including its presentation over the left app menus.
Barista cannot guarantee those menus stay visible while system overflow is open.

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
