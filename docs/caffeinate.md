# Caffeinate

The headline feature of Barista. This page covers what "caffeinate" actually does, the duration presets, and the edge cases worth knowing about.

## What it does

When you toggle caffeinate on (via the menu bar icon, the popup window, or the global hotkey), Barista asks macOS to suppress sleep on three levels at once:

- **System sleep** — the whole machine going to sleep (idle or scheduled).
- **Display sleep** — the screen turning off after the inactivity timeout.
- **Idle sleep** — sleep triggered by user inactivity, even when the display is on an external monitor.

It also asserts user activity periodically, so anything that watches `IOPMAssertion` state will see the Mac as "in use".

Internally this maps to the same kernel APIs that the built-in `caffeinate(1)` command uses, just packaged behind a menu bar icon and a countdown timer.

## Duration presets

Barista ships with the durations Caffeine.app users expect:

| Preset       | Minutes | Notes                                              |
| ------------ | ------- | -------------------------------------------------- |
| 15 minutes   | 15      | Quick demo, short download, a meeting.             |
| 30 minutes   | 30      | Default for many users.                            |
| 1 hour       | 60      | A movie, a long compile.                           |
| 4 hours      | 240     | A workshop, a long-running test suite.             |
| 8 hours      | 480     | A working day.                                     |
| 12 hours     | 720     | Overnight render, server-style workload.           |
| Indefinitely | -1      | Stays awake until you toggle it off (or reboot).   |

The current preset is highlighted in the popup window and shown in the tray menu's submenu. Picking a new preset while caffeinate is already on resets the timer.

## Edge cases

### Closing the lid (clamshell mode)

`caffeinate` keeps the system from sleeping due to **inactivity**. It does not prevent sleep when you close the lid on a MacBook unless an external display, power adapter and external keyboard/mouse are connected (this is "clamshell mode", and it's enforced by macOS, not by Barista).

If you need the Mac to keep working with the lid closed and no external display attached, that's outside what `caffeinate` can do — Apple does not expose an API to disable lid-close sleep.

### Display sleep vs system sleep

Barista prevents both by default. If you only want to prevent system sleep (and let the display turn off normally), that's not currently exposed in the UI — open an issue if you need it.

### Battery vs power adapter

Barista doesn't differentiate. Caffeinate stays on whether you're on battery or plugged in. If you're on battery, your Mac will keep working — and keep draining — until the timer expires or the battery does.

### Logging out, restarting, sleep buttons

- **Manual sleep** (Apple menu → Sleep, or closing the lid in a non-clamshell setup) overrides caffeinate. macOS sleeps anyway.
- **Logging out** ends Barista's process, which ends caffeinate.
- **Restart / shutdown** ends caffeinate.
- **Crash / force-quit** ends caffeinate (the IOKit assertion is released when the process dies).

### Caffeinate on startup

If `Caffeinate on Startup` is enabled in preferences, Barista enables caffeinate as soon as it launches — useful in combination with `Launch at Login` for "always awake" workflows. The duration used is whichever preset was last selected.

### Indefinite mode

Indefinite (`-1`) means "no timer". Barista will hold the assertion until you toggle it off, quit the app, or reboot. The tray icon will show ☕️ without a countdown.

## How it compares to `caffeinate(1)`

The built-in `caffeinate` CLI does the same thing under the hood, but:

- It runs in a terminal you have to keep open (or daemonize yourself).
- It has no UI, no countdown, no menu bar feedback.
- It doesn't remember your last duration.
- It can't be toggled with a global hotkey.

If you're comfortable in the terminal, `caffeinate -dimsu` does roughly what Barista does. Most people would rather just click an icon.

## Troubleshooting

**My Mac still went to sleep.**
Check whether you closed the lid (clamshell rules apply) or whether macOS forced sleep due to thermal / battery / power-button events. Caffeinate cannot override those.

**The countdown is wrong.**
The countdown is driven by the preference value at the time you toggled caffeinate on. If you change the preset mid-session, the timer resets — that's intentional.

**Caffeinate didn't survive a reboot.**
That's expected. Enable `Caffeinate on Startup` along with `Launch at Login` if you want it to come back automatically.
