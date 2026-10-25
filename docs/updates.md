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
The installed 0.0.6 app also downloaded and installed 0.0.7 through its own UI.
The replacement passed strict signing, stapling and Gatekeeper checks and
preserved login settings, Accessibility authorization and indefinite awake.
Verification exposed two failure cases: a full disk safely prevented replacement,
and a slow first document render caused WebKit to time out after restart. A
normal relaunch restored the 0.0.7 UI; that relaunch is not counted as a successful
first-load check. Version 0.0.8 includes the stx startup-readiness correction and keeps update
HTTP requests independent of background downloads. The running 0.0.7 app passed native timer, hide/reveal,
shortcut ownership and current-version checks after relaunch.

Release CI checks the packaged app and its read-only DMG, stages a prerelease,
then exercises the public stx/Craft updater against the downloaded release assets
before promoting it to latest. The automated harness verifies replacement and
native startup using an isolated profile and an explicit restart callback. The
installed-app checks below cover the interactive Install and Restart action.
See [Releasing](./releasing.md).

The actual installed 0.0.7 app downloaded and installed 0.0.8 through its native
update controls. Its new host and WebKit runtime became ready on the first
restart, without a manual relaunch. Signing, notarization, saved login/startup
preferences, Accessibility, shortcut ownership, real power assertions, timers
and hide/reveal were verified. A check in the installed 0.0.8 app returned
background progress in 4 ms and then settled to up to date.
