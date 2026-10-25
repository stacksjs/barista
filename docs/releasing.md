# Releasing

Barista has two Apple Silicon distributions. The GitHub edition ships a signed,
notarized app and DMG, including icon grouping and the self-updater. The Mac App
Store edition ships a sandboxed, Store-signed PKG for submission. Its public-only
Craft runtime excludes the private grouping API, and updates belong to Apple.

```sh
bun run check
pantry run build
bun run test:native
bun run release:patch
```

The release command bumps the version, commits and pushes its tag. The tag must
match `package.json`. Release CI installs the locked Pantry runtime, checks the
source, signs and notarizes the app and DMG, and verifies the packaged app and
read-only DMG before publishing the DMG and `update.json`.

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

Each edition has its own release tag. GitHub builds use `v0.0.8`; Store builds
use `app-store/v0.0.8` for the same app version. This lets each edition qualify
its required native runtime and signing path independently. Both tags must point
to verified source on `main`. Tag the Store edition only after its published
Pantry runtime passes the Store build and sandbox checks:

```sh
git tag app-store/v0.0.8
git push origin app-store/v0.0.8
```

The App Store workflow runs on these Store tags, using
the stable Xcode 27.0 toolchain on GitHub's `xcode-27` image. It imports Store
identities and the profile through Pantry, builds and verifies the
PKG, runs native tests in an isolated sandboxed development copy, then validates
and uploads through Apple’s tooling. The original distribution package remains
Store-signed. The PKG is retained as a CI artifact, not offered as a direct
download. The Store listing has metadata, a published privacy disclosure and
screenshots. Version 0.0.7 (build 1.1), using published Craft 0.0.340, passed
the local and CI sandbox checks and was accepted and processed by App Store
Connect. The build is selected on the listing; export compliance documentation
is still required before review submission. Upload success does not mean Apple
has approved a release.

The 0.0.8 candidate uses published stx 0.2.693 to prepare its first document
before opening WebKit. Both local editions pass their native checks with the
published Pantry Craft 0.0.340 runtime; its Store upload is pending.
