# GitHub Actions

This folder contains the following GitHub Actions:

- [CI][CI] - all CI jobs for the project
  - lints the code
  - `typecheck`s the code
  - runs test suite
  - runs on `ubuntu-latest`
  - builds and verifies the packaged app with real native E2E on `macos-latest`
- [Release][Release] - signs, notarizes and verifies the direct edition, stages a
  prerelease, exercises the real updater, then promotes it to latest
- [Verify release](./verify-release.yml) - verifies existing GitHub release
  downloads, Apple trust, updater replacement and native startup without
  rebuilding or changing the release
- [App Store](./app-store.yml) - builds and verifies the sandboxed edition and
  delivers its signed package to Apple

[CI]: ./ci.yml
[Release]: ./release.yml
