# Updates

The GitHub edition checks its own GitHub releases. Right-click the cup and choose the
update action, or open **Preferences → Updates → Check**.

The sandboxed Store edition receives updates through the Mac App Store. It has
no external update download or installation controls.

When a newer release is available, Barista downloads it in the background.
**Install and restart** becomes available after the download verifies. Choose
it to replace the app and restart the full host and native runtime.

## What gets verified

- The release manifest supplies the artifact’s SHA-256 checksum.
- The downloaded bytes must match that checksum.
- The replacement app must pass Apple notarization and signing checks.
- Its signing team must match Barista’s release team.

An invalid or incomplete download is not offered for installation. If a check
fails, the UI reports the error and lets you retry. If no newer version exists,
Preferences reports **Barista is up to date**.

Install and run Barista from **Applications**. Keep-awake, saved duration,
login startup and Dock preferences survive updates. Grouping starts revealed
after launch, so you can review the arrangement before hiding it again.

## Release verification

The real native updater has been exercised from a packaged 0.0.0 build to
0.0.4, from the installed 0.0.4 app to 0.0.5, and from 0.0.5 to 0.0.6.
The 0.0.6 verification checked full host/runtime restart, trusted signatures,
Apple notarization, preserved preferences and login configuration, Accessibility
authorization and native power assertions. Shortcut ownership remained registered after the
periodic refresh, and the native update check completed with “Barista is up
to date.” The installed app also passed repeated native hide/reveal checks.
Release CI separately checks the packaged app and its read-only DMG before
publication. See [Releasing](./releasing.md).
