# Updates

Barista checks its own GitHub releases. Right-click the cup and choose the
update action, or open **Preferences → Updates → Check**.

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

The 0.0.4 release was tested through the real native updater from a packaged
0.0.0 build. Verification covered full host/runtime restart, trusted signatures,
preserved preferences, login startup, Accessibility and global shortcuts.
Release CI separately checks the packaged app and its read-only DMG before
publication. See [Releasing](./releasing.md).
