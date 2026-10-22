# GitHub Actions

This folder contains the following GitHub Actions:

- [CI][CI] - all CI jobs for the project
  - lints the code
  - `typecheck`s the code
  - runs test suite
  - runs on `ubuntu-latest`
  - builds and verifies the packaged app with real native E2E on `macos-latest`
- [Release][Release] - automates the release process & changelog generation

[CI]: ./ci.yml
[Release]: ./release.yml
