# Keep awake

Left-click Barista’s cup or press **⌘⇧C** to start or stop a session. Right-click
for durations and Preferences. The filled, steaming cup means keep-awake is on;
hover over it for the remaining time.

## Durations

Choose **5m, 15m, 30m, 1h, 2h, 4h, 8h or ∞** in Preferences. Common durations
also appear directly in the native menu. Choosing a duration starts a session
or replaces the running session’s timer.

**∞** has no expiry timer. It stays active until you turn it off, quit Barista
or end the login session. Enable **Start awake** and **Open at login** to start
again automatically after signing in, using the saved duration.

## Native power assertions

Barista uses stx’s desktop power API, backed by macOS IOKit assertions. While
active, it holds display-idle and system-idle sleep assertions and a user-active
assertion. Turn Off and process exit release them. Timed sessions release them
when their duration expires.

These assertions control idle sleep. They do not promise to override manual
sleep, lid-close behavior, shutdown or macOS power and battery protections.

## Verification

The native E2E suite checks the packaged app against `pmset -g assertions`,
replaces timed and indefinite sessions, and verifies release on Turn Off and
shutdown. The installed app includes its own native runtime.
