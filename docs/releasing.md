# Releasing

Barista has two Apple Silicon distributions. The GitHub edition ships a signed,
notarized app and DMG, including icon grouping and the self-updater. The Mac App
Store edition ships a sandboxed, Store-signed PKG for submission with Craft’s
public-only runtime. It excludes icon grouping, and updates belong to Apple.

```sh
bun run check
pantry run build
bun run test:native
bun run release:patch
```

The release command bumps the version, commits and pushes its tag. The tag must
match `package.json`. Release CI installs the locked Pantry runtime, checks the
source, signs and notarizes the app and DMG, and verifies the packaged app and
read-only DMG before staging the DMG and `update.json` as a GitHub prerelease.
The updater qualification then downloads the previous stable app and the exact
candidate assets from GitHub. It exercises the public stx/Craft updater with
SHA-256 verification, same-team notarization checks, bundle replacement and a
native restart. The replacement must initialize on its first attempt, retain
isolated preferences and own real macOS keep-awake assertions. Only a passing
candidate becomes the latest stable release. A failed candidate stays a
prerelease, so installed apps continue to see the previous stable version.

Qualification runs on an idle macOS runner and refuses to run alongside an
existing Barista process. Its restart callback launches the packaged executable
with isolated preferences; the interactive Install and Restart route also needs
the installed-app verification described in [Updates](./updates.md).
Verification evidence is retained as a GitHub Actions artifact for 30 days.
The **Verify release** workflow can recheck existing assets without rebuilding
or changing a stable release. Stable release assets are immutable, and older
tags cannot replace a newer stable release.

## Encrypted signing configuration

Local credentials live in ignored `.env`. The tracked `.env.production` contains
Buddy Env encrypted values. The only GitHub credential secret required by this
flow is **`DOTENV_PRIVATE_KEY_PRODUCTION`**, matching the private production key
in ignored `.env.keys`.

The encrypted file holds these variables:

| Variable | Purpose |
| --- | --- |
| `APPLE_APPLICATION_CERTIFICATE` | Developer ID Application `.p12` with its intermediate chain, encoded as base64. |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the exported `.p12`. |
| `APPLE_NOTARY_API_KEY_BASE64` | App Store Connect API `.p8`, encoded as base64. |
| `APPLE_NOTARY_API_KEY_ID` | Apple API key identifier. |
| `APPLE_NOTARY_API_ISSUER` | Apple API issuer UUID. |
| `APPLE_NOTARIZE_TEAM_ID` | Developer signing team. |
| `APPLE_STORE_APPLICATION_CERTIFICATE` | Mac App Distribution `.p12`, base64 encoded. |
| `APPLE_STORE_INSTALLER_CERTIFICATE` | Mac Installer Distribution `.p12`, base64 encoded. |
| `APPLE_STORE_CERTIFICATE_PASSWORD` | Password for the Store identity exports. |
| `APPLE_STORE_PROVISIONING_PROFILE_BASE64` | Matching Mac App Store provisioning profile, base64 encoded. |
| `APPLE_STORE_APP_ID` | Barista’s App Store Connect app record ID. |
| `APPLE_STORE_SUBMISSION_API_KEY_BASE64` | Separate App Manager `.p8`, base64 encoded, for listing updates and review submission. |
| `APPLE_STORE_SUBMISSION_API_KEY_ID` | Submission key identifier. |
| `APPLE_STORE_SUBMISSION_API_ISSUER` | Submission key issuer UUID. |
| `APPLE_STORE_ENCRYPTION_DECLARATION_ID` | Apple’s encryption declaration reference; builds can use it only once Apple approves it. |
| `APPLE_STORE_REVIEW_FIRST_NAME`, `APPLE_STORE_REVIEW_LAST_NAME`, `APPLE_STORE_REVIEW_EMAIL`, `APPLE_STORE_REVIEW_PHONE` | Approved App Review contact, kept out of source and release receipts. |

Prepare the production values locally, then encrypt before staging:

```sh
bunx --bun @stacksjs/buddy@0.75.299 env:encrypt --file .env.production --file-keys .env.keys
```

When refreshing credentials, start from the existing encrypted file so Buddy
can retain its key. If a new key is created, update the matching GitHub secret
before releasing. Commit only encrypted `.env.production`; never commit `.env`,
`.env.keys`, `.p8` or `.p12` files.

CI decrypts into temporary runner files, masks values, imports the Developer ID
identity through Pantry, and writes the notarization key with mode `0600`.
Plaintext temporary files are cleaned up after the job. No Apple ID password or
notarytool keychain profile is used by this release workflow.

## Local builds and verification

`APPLE_SIGNING_IDENTITY=- pantry run build` creates an ad hoc signed verification
bundle. A distributable local build requires a Developer ID Application identity
and the `APPLE_NOTARY_API_KEY_PATH`, `APPLE_NOTARY_API_KEY_ID` and
`APPLE_NOTARY_API_ISSUER` notarization configuration.

The bundle ID is `com.stacksjs.barista`; the release signing team is `3JJRNQW6B7`.
The normal build resolves Craft through Pantry. Native E2E clones the packaged
app into an isolated identity and preference profile so it does not change the
installed app’s login item or saved preferences. Physical ⌘-drag arrangements
also need a native desktop check.

See [Updates](./updates.md) for the installed updater’s verification process.

## Mac App Store

```sh
pantry run build:app-store
bun run test:native:store
```

Local packaging requires `APPLE_STORE_SIGNING_IDENTITY`,
`APPLE_STORE_INSTALLER_IDENTITY` and `APPLE_STORE_PROVISIONING_PROFILE`.
`APPLE_STORE_KEYCHAIN` selects a private signing keychain when needed. The output
is under `dist/app-store/`. The build requires Pantry’s adjacent
`craft-app-store` runtime and refuses a runtime containing private APIs.

Craft owns the native application, AppKit lifecycle and login registration.
The compiled TypeScript backend inherits its sandbox and serves authenticated
loopback requests. Store builds exclude grouping controls and external updater
actions. Open at Login starts off and uses the native macOS login service when
enabled.

One `vMAJOR.MINOR.PATCH` tag starts both edition workflows. Each qualifies its
runtime, signing and native behavior independently. The tag must match
`package.json` and point to verified source on `main`. Legacy `app-store/v*`
tags remain supported for Store-only delivery; normal releases need one tag.

To recheck existing downloads without rebuilding or replacing release assets:

```sh
gh workflow run verify-release.yml -f tag=v0.0.8 -f store_run_id=40168009230
```

To qualify current source with real Store signing, sandbox checks and fresh
screenshots before tagging, dispatch **App Store** on `main` with `deliver`
off. That mode retains its signed package and artwork without uploading a new
build to Apple. Tag pushes always perform delivery after qualification.

The App Store workflow runs on the release tag, using
the stable Xcode 27.0 toolchain on GitHub's `xcode-27` image. It imports Store
identities and the profile through Pantry, builds and verifies the
PKG, runs native tests in an isolated sandboxed development copy, then validates
and uploads through Apple’s tooling. Native E2E also captures the packaged stx
view in awake, timed and off states and renders the Store compositions through
stx’s system WebKit screenshot API. Artifact manifests bind the images to the
app version and source commit. The original distribution package remains
Store-signed. The PKG is retained as a CI artifact, not offered as a direct
download. The Store listing has metadata, a published privacy disclosure and
screenshots. Version 0.0.8 (build 2.1), using published Craft 0.0.340, passed
the local and CI sandbox checks and was accepted and processed by App Store
Connect. Version 0.0.9 (build 6.1) is now selected on the listing. ANSSI’s
official declaration attestation has been uploaded to Apple and is in
export-compliance review as of October 25, 2026.
Upload success does not mean Apple has approved a release.

After upload, Pantry waits for Apple to process the exact build, selects it,
synchronizes the listing and screenshots, attaches an approved encryption
declaration and submits to App Review. Automatic release after approval is
enabled. The separate **Store submission** workflow resumes the latest stable
GitHub version every six hours, or can be dispatched with a release tag. It
does not rebuild, replace a selected in-review build, or resubmit an active
review. It records `awaiting-export-approval`, `awaiting-app-review`,
`submitted-for-review`, `awaiting-storefront`, `published` or a failure receipt
in Actions artifacts. `published` additionally requires Apple’s public US
storefront to return the matching bundle and version. Review rejections and
developer withdrawals require a deliberate manual dispatch with `resubmit`
after the feedback is resolved; the schedule does not keep resubmitting them.
Apple remains responsible for compliance review and App Review decisions.

The submission key is separate from the Developer key used for signing and
uploads. All Store mutations are serialized across delivery and resume runs.
The encryption declaration can cover later app versions only while their
cryptographic characteristics remain unchanged. Store builds check the Bun
compiler version and revision against `resources/app-store/encryption-scope.json`;
review that scope and Apple’s declaration before updating the baseline.

The 0.0.8 release uses published stx 0.2.693 to prepare its first document
before opening WebKit. Both local editions pass their native checks with the
published Pantry Craft 0.0.340 runtime. The GitHub release is published and the
Store upload was accepted and processed. Export compliance is in Apple’s review.

Version 0.0.9 uses stx 0.2.696, Craft 0.0.346 and Pantry 0.11.128. Its release
workflow staged the signed, notarized download, qualified the real 0.0.8 → 0.0.9
updater replacement and native restart on a fresh macOS runner, then promoted
the release to latest. The installed app also updated through its own controls
without a manual relaunch. Native readiness, Apple trust, Accessibility, login
preferences, indefinite awake, timers and two hide/reveal cycles passed.
The Store workflow generated current artwork, validated and uploaded build 6.1,
selected it, and recorded `awaiting-export-approval`. The artwork restore path
was also verified against the retained CI artifact and release commit.
