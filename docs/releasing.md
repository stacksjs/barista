# Releasing

Barista ships a signed, notarized direct app and DMG for Apple Silicon.
Icon grouping uses a private macOS API, so the build refuses App Store packaging.

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

Prepare the production values locally, then encrypt before staging:

```sh
bunx --bun @stacksjs/buddy@0.75.283 env:encrypt --file .env.production --file-keys .env.keys
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
