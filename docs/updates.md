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
0.0.4, and from the installed 0.0.4 app to 0.0.5. Verification covered full
host/runtime restart, trusted signatures, preserved preferences, login startup,
Accessibility and native power assertions. The 0.0.5 check also exposed a
shortcut-readiness reporting race; the next build refreshes that state from the
native registration and checks it after the periodic UI refresh.
Release CI separately checks the packaged app and its read-only DMG before
publication. See [Releasing](./releasing.md).
